create table users(id text primary key, role text not null);
create table tasks(id text primary key, owner_id text not null references users(id));
