-- Supabase SQL Schema for Manager Pro

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  profiles TEXT[] DEFAULT '{}',
  activity_status TEXT CHECK (activity_status IN ('Activo', 'De Baja')),
  location_status TEXT CHECK (location_status IN ('En el centro', 'Fuera del centro')),
  contract_type TEXT CHECK (contract_type IN ('Fijo', 'Interino')),
  role_type TEXT CHECK (role_type IN ('Titular', 'Sustituto')),
  classroom_id TEXT,
  phone TEXT,
  secondary_phone TEXT,
  address TEXT,
  student_simulated_profile TEXT CHECK (student_simulated_profile IN ('teacher', 'almacen')),
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  reference TEXT NOT NULL,
  unit TEXT NOT NULL,
  tax NUMERIC NOT NULL,
  category TEXT NOT NULL,
  family TEXT NOT NULL,
  allergens TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('Activo', 'Inactivo')),
  product_state TEXT,
  warehouse_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cif TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  status TEXT CHECK (status IN ('Activo', 'Inactivo')),
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Regular', 'Extraordinario')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  budget_per_teacher NUMERIC NOT NULL,
  authorized_teachers TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('Activo', 'Inactivo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  event_id UUID REFERENCES events(id),
  cost NUMERIC,
  notes TEXT,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  author_id UUID REFERENCES users(id),
  yield_amount NUMERIC NOT NULL,
  yield_unit TEXT NOT NULL,
  category TEXT NOT NULL,
  preparation_steps TEXT,
  is_public BOOLEAN DEFAULT false,
  cost NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  ingredients JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES users(id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classrooms Table
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES users(id)
);

-- Training Cycles Table
CREATE TABLE IF NOT EXISTS training_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modules Table
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES training_cycles(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES modules(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  group_id UUID REFERENCES groups(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock Items Table
CREATE TABLE IF NOT EXISTS mini_economato_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Groups Table
CREATE TABLE IF NOT EXISTS service_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES service_groups(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classroom Products Table
CREATE TABLE IF NOT EXISTS classroom_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id),
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL DEFAULT 0
);

-- Classroom Suppliers Table
CREATE TABLE IF NOT EXISTS classroom_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id),
  supplier_id UUID REFERENCES suppliers(id)
);

-- Classroom Events Table
CREATE TABLE IF NOT EXISTS classroom_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id),
  event_id UUID REFERENCES events(id)
);

-- Classroom Orders Table
CREATE TABLE IF NOT EXISTS classroom_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id),
  order_id UUID REFERENCES orders(id)
);

-- RLS for new tables
ALTER TABLE training_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_economato_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON training_cycles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON modules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON mini_economato_stock FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON service_groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON services FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON classroom_products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON classroom_suppliers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON classroom_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON classroom_orders FOR SELECT USING (auth.role() = 'authenticated');
