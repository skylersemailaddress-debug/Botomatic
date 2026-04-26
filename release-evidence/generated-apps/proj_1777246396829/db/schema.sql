create table organizations (id text primary key, name text not null);
create table users (id text primary key, organization_id text not null references organizations(id), role text not null);
