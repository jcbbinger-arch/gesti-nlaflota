import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { PlusIcon, DownloadIcon } from '../../components/icons';
import { Message, User, Profile, SUPER_USER_EMAILS } from '../../types';
import { downloadJson, addHeaderToPdf } from '../../utils/export';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useCompany } from '../../contexts/CompanyContext';

export const ComposeMessageModal: React.FC<{ 
    users: User[], 
    onClose: () => void, 
    onSend: (msg: any, type: 'group' | 'broadcast') => void,
    initialSubject?: string,
    initialBody?: string,
    recipients?: string[]
}> = ({ users, onClose, onSend, initialSubject = '', initialBody = '', recipients: initialRecipients = [] }) => {
    const { currentUser } = useAuth();
    const { classrooms } = useData();
    const [recipients, setRecipients] = useState<string[]>(initialRecipients);
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [searchTerm, setSearchTerm] = useState('');
    const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
    const [messageType, setMessageType] = useState<'group' | 'broadcast'>('group');

    const isStudent = currentUser?.profiles.includes(Profile.STUDENT);

    const recipientOptions = useMemo(() => {
        const potentialRecipients = users.filter(u => 
            u.id !== currentUser?.id && 
            !SUPER_USER_EMAILS.includes(u.email)
        );

        if (isStudent && currentUser?.classroom_id) {
            const myClassroom = classrooms.find(c => c.id === currentUser.classroom_id);
            if (myClassroom) {
                const tutor = users.find(u => u.id === myClassroom.tutor_id);
                const classmates = potentialRecipients.filter(u => u.classroom_id === currentUser.classroom_id);
                return [tutor, ...classmates].filter((u): u is User => !!u);
            }
            return [];
        }
        return potentialRecipients;
    }, [users, currentUser, isStudent, classrooms]);

    const filteredRecipients = useMemo(() => {
        if (!searchTerm) return recipientOptions;
        const lowerTerm = searchTerm.toLowerCase();
        return recipientOptions.filter(u => 
            (u.name && u.name.toLowerCase().includes(lowerTerm)) || 
            (u.email && u.email.toLowerCase().includes(lowerTerm))
        );
    }, [recipientOptions, searchTerm]);

    const handleRecipientToggle = (userId: string) => {
        setRecipients(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectGroup = (profile: Profile) => {
        const groupIds = users.filter(u => u.profiles.includes(profile) && u.id !== currentUser?.id && !SUPER_USER_EMAILS.includes(u.email)).map(u => u.id);
        const newRecipients = Array.from(new Set([...recipients, ...groupIds]));
        setRecipients(newRecipients);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend({ recipient_ids: recipients, subject, body, attachment }, messageType);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Redactar Mensaje">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label>Para:</label>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar nombre o email..." className="w-full p-2 border rounded dark:bg-gray-700 mb-2 text-sm" />
                    <div className="w-full h-40 p-2 border rounded dark:bg-gray-700 overflow-y-auto">
                        {filteredRecipients.map(user => (
                            <label key={user.id} className="flex items-center space-x-2 py-1 hover:bg-gray-600/20 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={recipients.includes(user.id)}
                                    onChange={() => handleRecipientToggle(user.id)}
                                />
                                <span className="text-sm">{user.name}</span>
                            </label>
                        ))}
                    </div>
                    {!isStudent && (
                        <div className="flex space-x-2 mt-1">
                            <button type="button" onClick={() => handleSelectGroup(Profile.TEACHER)} className="text-xs bg-gray-200 px-2 py-1 rounded">Profesores</button>
                             <button type="button" onClick={() => handleSelectGroup(Profile.ADMIN)} className="text-xs bg-gray-200 px-2 py-1 rounded">Admins</button>
                        </div>
                    )}
                </div>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Asunto" required className="w-full p-2 border rounded dark:bg-gray-700"/>
                <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Mensaje..." rows={5} required className="w-full p-2 border rounded dark:bg-gray-700"/>
                
                <div className="flex gap-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="radio" checked={messageType === 'group'} onChange={() => setMessageType('group')} />
                        <span>Grupo (Chat común)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="radio" checked={messageType === 'broadcast'} onChange={() => setMessageType('broadcast')} />
                        <span>Difusión (Privado individual)</span>
                    </label>
                </div>
                <div>
                    <label className="block text-sm font-medium">Adjunto:</label>
                    <input type="file" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setAttachment({ name: file.name, content: reader.result as string });
                            reader.readAsDataURL(file);
                        }
                    }} className="text-sm p-1" />
                </div>
                <div className="flex justify-end pt-4"><button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-md">Enviar</button></div>
            </form>
        </Modal>
    );
};


// Helper to handle safe date expiration check
const isMessageExpiredForMe = (message: Message, userId: string) => {
    if (!message || !message.read_at || !message.read_at[userId]) return false;
    const readDate = new Date(message.read_at[userId]);
    if (isNaN(readDate.getTime())) return false;
    const expiryDate = new Date(readDate);
    expiryDate.setDate(expiryDate.getDate() + 15);
    return new Date() > expiryDate;
};

const ChatWindow: React.FC<{ 
    subject: string, 
    messages: Message[], 
    usersMap: Map<string, User>, 
    onClose: () => void, 
    onReply: (subject: string, recipients: string[]) => void 
}> = ({ subject, messages, usersMap, onClose, onReply }) => {
    const { currentUser } = useAuth();
    const sortedMessages = [...messages].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Get unique recipients (excluding sender) to reply to
    const allRecipientIds = new Set<string>();
    messages.forEach(m => {
        m.recipient_ids.forEach(id => allRecipientIds.add(id));
        if (m.sender_id !== currentUser?.id) allRecipientIds.add(m.sender_id);
    });
    if (currentUser) allRecipientIds.delete(currentUser.id);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Chat: ${subject}`}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2 bg-gray-100 dark:bg-gray-900 rounded-md">
                {sortedMessages.map(msg => {
                    const isCurrentUser = msg.sender_id === currentUser?.id;
                    return (
                        <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${isCurrentUser ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-700'}`}>
                                <p className="text-xs font-semibold opacity-75">{usersMap.get(msg.sender_id)?.name}</p>
                                <p className="text-sm mt-1">{msg.body}</p>
                                {msg.attachment && !isMessageExpiredForMe(msg, currentUser?.id || '') && (
                                    <div className="mt-2 text-xs p-2 bg-black/10 rounded">
                                        <p>Adjunto: <a href={msg.attachment.content} download={msg.attachment.name} className="underline">{msg.attachment.name}</a></p>
                                        <p className="opacity-75">* Se eliminará en {(15 - Math.floor((Date.now() - new Date(msg.read_at?.[currentUser?.id || ''] || msg.date).getTime()) / (24*60*60*1000))) } días.</p>
                                    </div>
                                )}
                                <p className="text-[10px] mt-1 opacity-75 text-right">{new Date(msg.date).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={() => onReply(subject, Array.from(allRecipientIds))} className="bg-primary-600 text-white px-6 py-2 rounded-md">Responder</button>
            </div>
        </Modal>
    );
};

export const Messaging: React.FC = () => {
    const { messages, setMessages, users } = useData();
    const { currentUser } = useAuth();
    const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
    const [composeParams, setComposeParams] = useState<{ subject: string, body: string, recipients?: string[] } | null>(null);
    const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);

    const usersMap = useMemo(() => new Map((users || []).map(u => [u.id, u])), [users]);

    const threads = useMemo(() => {
        if (!currentUser) return [];
        const groups: Record<string, Message[]> = {};
        messages.filter(m => m.recipient_ids.includes(currentUser.id) || m.sender_id === currentUser.id).forEach(m => {
            const participants = [m.sender_id, ...m.recipient_ids].filter(id => id !== currentUser.id);
            const key = participants.sort().join('-');
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
        });
        return Object.entries(groups).sort((a, b) => new Date(b[1][b[1].length-1].date).getTime() - new Date(a[1][a[1].length-1].date).getTime());
    }, [messages, currentUser]);

    const handleReply = (recipients: string[]) => {
        setComposeParams({ subject: 'Re: Conversación', body: '', recipients });
        setSelectedThreadKey(null);
        setIsComposeModalOpen(true);
    };

    const handleOpenCompose = () => {
        setComposeParams(null);
        setIsComposeModalOpen(true);
    };

    const handleSendMessage = (newMessage: Omit<Message, 'id' | 'date' | 'sender_id' | 'read_by' | 'read_at'>, type: 'group' | 'broadcast') => {
        if (!currentUser) return;
        
        const messagesToSend = type === 'broadcast'
            ? newMessage.recipient_ids.map(rId => ({
                ...newMessage,
                recipient_ids: [rId]
            }))
            : [newMessage];

        const newMessages = messagesToSend.map(msg => ({
            id: `msg-${Date.now()}-${Math.random()}`,
            sender_id: currentUser.id,
            date: new Date().toISOString(),
            read_by: { [currentUser.id]: true },
            read_at: { [currentUser.id]: new Date().toISOString() },
            ...msg
        }));

        setMessages([...messages, ...newMessages]);
        setIsComposeModalOpen(false);
        alert(type === 'broadcast' ? 'Difusión enviada individualmente' : 'Grupo creado/mensaje enviado');
    };

    if (!currentUser) return null;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Mensajes (Conversaciones)</h1>
                <button onClick={handleOpenCompose} className="bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 flex items-center">
                    <PlusIcon className="w-5 h-5 mr-1" /> Nuevo Chat
                </button>
            </div>
            
            <Card title="Conversaciones">
                <div className="space-y-2">
                    {threads.map(([key, msgs]) => {
                        const lastMsg = msgs[msgs.length - 1];
                        const isUnread = !lastMsg.read_by[currentUser.id];
                        const participantIds = key.split('-');
                        const displayName = participantIds.map(id => usersMap.get(id)?.name || 'Usuario').join(', ');
                        return (
                            <div key={key} onClick={() => setSelectedThreadKey(key)} className={`p-4 rounded-md cursor-pointer border ${isUnread ? 'bg-blue-50 dark:bg-blue-900/20 border-primary-500' : 'bg-gray-50 dark:bg-gray-700 border-gray-200'}`}>
                                <div className="flex justify-between">
                                    <p className="font-bold">{displayName}</p>
                                    <span className="text-xs text-gray-500">{new Date(lastMsg.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm truncate">{lastMsg.body}</p>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {isComposeModalOpen && (
                <ComposeMessageModal 
                    users={users} 
                    onClose={() => setIsComposeModalOpen(false)} 
                    onSend={handleSendMessage}
                    {...(composeParams || {})}
                />
            )}
            {selectedThreadKey && (
                <ChatWindow 
                    subject={(() => {
                        const ids = selectedThreadKey.split('-');
                        return ids.map(id => usersMap.get(id)?.name || 'Usuario').join(', ');
                    })()} 
                    messages={threads.find(t => t[0] === selectedThreadKey)?.[1] || []}
                    usersMap={usersMap} 
                    onClose={() => setSelectedThreadKey(null)} 
                    onReply={() => handleReply(selectedThreadKey.split('-'))}
                />
            )}
        </div>
    );
};
