#!/bin/bash

echo "=================================================="
echo "🚀 INICIANDO A MÁGICA: SETUP DO BACKEND"
echo "=================================================="

echo "📦 1. Criando a estrutura base do NestJS (isso pode levar 1-2 minutos)..."
# Cria o projeto na pasta "backend" usando o gerenciador npm e pulando a criação do git
npx @nestjs/cli new backend --package-manager npm --skip-git

cd backend

echo "🗄️ 2. Instalando o Banco de Dados (Prisma ORM)..."
npm install prisma --save-dev
npm install @prisma/client
npm install ts-node --save-dev
npx prisma init

echo "📝 3. Criando o Schema do Banco de Dados..."
cat << 'EOF' > prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  STUDENT
  ADMIN
  TEACHER
}

model User {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  passwordHash String
  role         Role      @default(STUDENT)
  avatarUrl    String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  attempts     Attempt[]
}

model Course {
  id          String   @id @default(uuid())
  title       String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  modules     Module[]
}

model Module {
  id          String   @id @default(uuid())
  title       String
  description String?
  order       Int
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons     Lesson[]
  questions   Question[]
  attempts    Attempt[]
}

enum LessonType {
  VIDEO
  TEXT
  AUDIO
}

model Lesson {
  id          String     @id @default(uuid())
  title       String
  content     String     @db.Text
  type        LessonType
  order       Int
  moduleId    String
  module      Module     @relation(fields: [moduleId], references: [id], onDelete: Cascade)
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  FILL_BLANK
}

model Question {
  id          String       @id @default(uuid())
  prompt      String       @db.Text
  type        QuestionType
  moduleId    String
  module      Module       @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  options     Option[]
}

model Option {
  id          String   @id @default(uuid())
  text        String   @db.Text
  isCorrect   Boolean
  questionId  String
  question    Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
}

model Attempt {
  id          String   @id @default(uuid())
  score       Float
  finishedAt  DateTime @default(now())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  moduleId    String
  module      Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
}
EOF

echo "⚙️ 4. Conectando o NestJS com o Prisma..."
mkdir -p src/prisma

cat << 'EOF' > src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
EOF

cat << 'EOF' > src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
EOF

echo "✅ 5. Configurando ambiente..."
npm pkg set prisma.seed="ts-node prisma/seed.ts"

echo "=================================================="
echo "🎉 MÁGICA CONCLUÍDA: PROJETO CRIADO COM SUCESSO!"
echo "=================================================="