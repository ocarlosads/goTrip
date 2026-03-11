import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { OAuth2Client } from "google-auth-library";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "./src/lib/prisma";

const resend = new Resend("re_ZVRXdGN8_LZXvgcV957hozut5n1z14c6q");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "checktrip-secret-key-123";
const GOOGLE_CLIENT_ID = "923509761070-56p6i5iju5ofefm4q7ieokor78luchm5.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  console.log("==================================================");
  console.log("!!! SERVER VERSION 5.0 - EMAIL VERIFICATION ON !!!");
  console.log("==================================================");

  // CORS Manual
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
  });

  app.use(express.json());
  app.use(cookieParser());

  console.log("DATABASE_URL defined:", !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    let dbUrl = process.env.DATABASE_URL.trim();
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) dbUrl = dbUrl.substring(1, dbUrl.length - 1);
    if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) dbUrl = dbUrl.substring(1, dbUrl.length - 1);
    process.env.DATABASE_URL = dbUrl;
    console.log("DATABASE_URL length:", dbUrl.length);
    console.log("DATABASE_URL starts with postgresql://:", dbUrl.startsWith("postgresql://"));
  }

  // ─── Health ───────────────────────────────────────────────────────────────
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // ─── Auth Middleware ───────────────────────────────────────────────────────
  const authenticate = (req: any, res: any, next: any) => {
    let token = req.cookies.auth_token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) token = authHeader.substring(7);

    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // ─── Auth Endpoints ────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: "E-mail já cadastrado" });

      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário diretamente (removida verificação por enquanto)
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split("@")[0],
          isVerified: true
        }
      });

      const authToken = jwt.sign({ email: user.email, id: user.id, role: (user as any).role }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth_token", authToken, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });

      console.log(`[AUTH] Usuário registrado diretamente: ${email}`);
      res.json({ success: true, user: { email: user.email, id: user.id, role: (user as any).role }, token: authToken });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Erro ao realizar cadastro" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    const { email, token } = req.body;
    try {
      const pending = await prisma.pendingUser.findUnique({ where: { email } });
      if (!pending) return res.status(404).json({ error: "Cadastro expirado ou não encontrado" });

      if (pending.verificationToken === token) {
        // Criar CONTA REAL agora!
        const user = await prisma.user.create({
          data: {
            email: pending.email,
            password: pending.password,
            name: pending.name,
            isVerified: true
          }
        });

        // Deletar pendente
        await prisma.pendingUser.delete({ where: { email } });

        const authToken = jwt.sign({ email: user.email, id: user.id, role: (user as any).role }, JWT_SECRET, { expiresIn: "7d" });
        res.cookie("auth_token", authToken, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
        return res.json({ success: true, user: { email: user.email, id: user.id, role: (user as any).role }, token: authToken });
      } else {
        return res.status(400).json({ error: "Código de verificação inválido" });
      }
    } catch (err) {
      console.error("Verify error:", err);
      res.status(500).json({ error: "Erro ao verificar e-mail" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos" });

      if (user.password) {
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: "E-mail ou senha inválidos" });

        if (!user.isVerified) {
          return res.status(403).json({ error: "E-mail não verificado", needsVerification: true, email: user.email });
        }
      } else if (!user.googleId) {
        return res.status(400).json({ error: "Esta conta usa outro método de login" });
      }

      const token = jwt.sign({ email: user.email, id: user.id, role: (user as any).role }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth_token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ user: { email: user.email, id: user.id, role: (user as any).role, identityDocUrl: (user as any).identityDocUrl }, token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    const { credential } = req.body;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error("Invalid google token");

      const { email, sub: googleId, name, picture } = payload;
      if (!email) throw new Error("Email missing from google");

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: { email, googleId, name, image: picture }
        });
      } else if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId }
        });
      }

      const token = jwt.sign({ email: user.email, id: user.id, role: (user as any).role }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth_token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ user: { email: user.email, id: user.id, name: user.name, image: user.image, role: (user as any).role, identityDocUrl: (user as any).identityDocUrl }, token });
    } catch (err: any) {
      console.error("Google Auth Error Detail:", err.message, err.stack);
      res.status(401).json({ error: "Falha na autenticação com Google", details: err.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      res.json({
        user: {
          email: req.user.email,
          id: dbUser?.id || null,
          role: (dbUser as any)?.role || "USER",
          identityDocUrl: (dbUser as any)?.identityDocUrl || null
        }
      });
    } catch {
      res.json({ user: req.user });
    }
  });

  app.put("/api/user/identity", authenticate, async (req: any, res) => {
    const { identityDocUrl } = req.body;
    try {
      const updatedUser = await prisma.user.update({
        where: { id: (req as any).user.id },
        data: { identityDocUrl }
      });
      console.log(`[IDENTITY_UPDATE] User ${(req as any).user.id} updated with ${identityDocUrl}`);
      res.json({ success: true, identityDocUrl: (updatedUser as any).identityDocUrl });
    } catch (err) {
      console.error("Error updating identity doc:", err);
      res.status(500).json({ error: "Erro ao atualizar documento de identidade" });
    }
  });

  // ─── Group Endpoints ───────────────────────────────────────────────────────
  app.post("/api/groups", authenticate, async (req: any, res) => {
    const BRAZIL_DEFAULT_IMAGES = [
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92", // Rio de Janeiro
      "https://images.unsplash.com/photo-1596738980315-998845c48202", // Lençóis Maranhenses
      "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f", // Fernando de Noronha
      "https://images.unsplash.com/photo-1589308454676-92d640203f44", // Cataratas do Iguaçu
      "https://images.unsplash.com/photo-1582298538104-fe2e74c27f59", // Salvador
      "https://images.unsplash.com/photo-1516908205727-40afad9449a8", // Amazônia
      "https://images.unsplash.com/photo-1598911515783-6cc35198818c", // Jalapão
      "https://images.unsplash.com/photo-1591543620767-58ec7f37f374", // Arraial do Cabo
      "https://images.unsplash.com/photo-1621517406451-996ff52e4630", // Bonito
      "https://images.unsplash.com/photo-1622544521448-9f1504938099"  // Chapada dos Veadeiros
    ];
    const defaultImage = BRAZIL_DEFAULT_IMAGES[Math.floor(Math.random() * BRAZIL_DEFAULT_IMAGES.length)] + "?q=80&w=1470&auto=format&fit=crop";
    const groupImage = image || defaultImage;

    try {
      const user = await prisma.user.upsert({
        where: { email: req.user.email },
        update: {},
        create: { email: req.user.email, name: req.user.email.split("@")[0] },
      });

      const newGroup = await (prisma.group as any).create({
        data: {
          name, description, type: type || "group", inviteCode, ownerId: user.id, image: groupImage,
          startDate: startDate ? new Date(startDate.includes("T") ? startDate : `${startDate}T12:00:00Z`) : null,
          endDate: endDate ? new Date(endDate.includes("T") ? endDate : `${endDate}T12:00:00Z`) : null,
          members: { create: { userId: user.id, role: "OWNER" } },
        },
      });

      // Gerar roteiro automaticamente se houver datas
      if (startDate && endDate) {
        const start = new Date(startDate.includes("T") ? startDate : `${startDate}T12:00:00Z`);
        const end = new Date(endDate.includes("T") ? endDate : `${endDate}T12:00:00Z`);
        const daysToCreate = [];

        // Loop por cada dia do intervalo
        let current = new Date(start);
        while (current <= end) {
          daysToCreate.push({
            groupId: newGroup.id,
            title: `Dia ${daysToCreate.length + 1}`,
            date: new Date(current),
            type: "day_header"
          });
          current.setDate(current.getDate() + 1);
        }

        if (daysToCreate.length > 0) {
          await prisma.itineraryItem.createMany({
            data: daysToCreate
          });
        }
      }

      res.json({ ...newGroup, memberCount: 1, userBalance: 0, image: newGroup.image });
    } catch (err) {
      console.error("Error creating group:", err);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.put("/api/groups/:groupId/settings", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { image, startDate, endDate } = req.body;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });

      if (!isAdmin && (!membership || (membership as any).role !== "OWNER")) {
        return res.status(403).json({ error: "Forbidden. Only owners or admins can change settings." });
      }

      const updateData: any = {};
      if (image !== undefined) updateData.image = image;

      if (startDate !== undefined) {
        if (startDate === null) updateData.startDate = null;
        else updateData.startDate = new Date(startDate.includes("T") ? startDate : `${startDate}T12:00:00Z`);
      }

      if (endDate !== undefined) {
        if (endDate === null) updateData.endDate = null;
        else updateData.endDate = new Date(endDate.includes("T") ? endDate : `${endDate}T12:00:00Z`);
      }

      const updatedGroup = await (prisma.group as any).update({
        where: { id: groupId },
        data: updateData
      });

      res.json(updatedGroup);
    } catch (err) {
      console.error("Error updating group settings:", err);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.get("/api/groups/invite/:code", async (req, res) => {
    const { code } = req.params;
    try {
      const group = await prisma.group.findUnique({ where: { inviteCode: code }, include: { owner: true } });
      if (!group) return res.status(404).json({ error: "Group not found" });
      res.json({ name: group.name, description: group.description, owner: group.owner.name || group.owner.email });
    } catch {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });

  app.post("/api/groups/join/:code", authenticate, async (req: any, res) => {
    const { code } = req.params;
    try {
      const group = await prisma.group.findUnique({ where: { inviteCode: code } });
      if (!group) return res.status(404).json({ error: "Group not found" });

      const user = await prisma.user.upsert({
        where: { email: req.user.email },
        update: {},
        create: { email: req.user.email, name: req.user.email.split("@")[0] },
      });

      const existing = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
      });
      if (existing) return res.json({ message: "Already a member", group });

      await prisma.membership.create({ data: { userId: user.id, groupId: group.id, role: "MEMBER" } });
      res.json({ message: "Joined successfully", group });
    } catch (err) {
      console.error("Error joining group:", err);
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  app.patch("/api/groups/:groupId/image", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { image } = req.body;

    try {
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      if (!dbUser) return res.status(401).json({ error: "Unauthorized" });

      const defaultImage = "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=1470&auto=format&fit=crop";
      const groupImage = image || defaultImage;

      const updatedGroup = await prisma.group.update({
        where: { id: groupId },
        data: { image: groupImage }
      });
      res.json(updatedGroup);
    } catch (err) {
      console.error("Error updating group image:", err);
      res.status(500).json({ error: "Failed to update group image" });
    }
  });

  app.delete("/api/groups/:groupId", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      const isAdmin = (dbUser as any)?.role === "ADMIN";

      if (!isAdmin) {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores podem excluir grupos." });
      }

      await (prisma.group as any).delete({
        where: { id: groupId }
      });

      console.log(`[GROUP_DELETE] Admin ${(dbUser as any).id} deleted group ${groupId}`);
      res.json({ success: true, message: "Grupo excluído com sucesso." });
    } catch (err) {
      console.error("Error deleting group:", err);
      res.status(500).json({ error: "Erro ao excluir o grupo." });
    }
  });

  app.get("/api/groups", authenticate, async (req: any, res) => {
    try {
      const isAdmin = req.user.role === "ADMIN";

      if (isAdmin) {
        // Admin vê TUDO
        const allGroups = await prisma.group.findMany({
          include: { members: true },
          orderBy: { createdAt: "desc" }
        });
        return res.json(allGroups.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description,
          type: g.type,
          inviteCode: g.inviteCode,
          memberCount: g.members.length,
          userBalance: 0,
          image: g.image,
          startDate: g.startDate,
          endDate: g.endDate,
        })));
      }

      // Usuário comum vê só os dele
      const user = await prisma.user.findUnique({
        where: { email: req.user.email },
        include: { memberships: { include: { group: { include: { members: true } } } } },
      });
      if (!user) return res.json([]);

      const groups = user.memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
        type: m.group.type,
        inviteCode: m.group.inviteCode,
        memberCount: m.group.members.length,
        userBalance: 0,
        image: m.group.image,
        startDate: m.group.startDate,
        endDate: m.group.endDate,
      }));
      res.json(groups);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  // ─── Members Endpoints ─────────────────────────────────────────────────────
  app.get("/api/groups/:groupId/members", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });

      const members = await prisma.membership.findMany({
        where: { groupId },
        include: { user: true },
      });
      res.json(members.map((m) => ({
        id: m.user.id,
        name: m.user.name || m.user.email.split("@")[0],
        email: m.user.email,
        role: m.role,
      })));
    } catch {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.delete("/api/groups/:groupId/leave", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const user = await prisma.user.findUnique({ where: { email: req.user.email } });
      if (!user) return res.status(404).json({ error: "User not found" });
      await prisma.membership.delete({ where: { userId_groupId: { userId: user.id, groupId } } });
      res.json({ success: true });
    } catch (err) {
      console.error("Error leaving group:", err);
      res.status(500).json({ error: "Failed to leave group" });
    }
  });

  // ─── Group Global Data (Pre-fetching) ──────────────────────────────────────
  app.get("/api/groups/:groupId/data", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });

      // Validar acesso (admin ou membro)
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: dbUser?.id || "", groupId } }
      });

      if (!isAdmin && !membership) {
        return res.status(403).json({ error: "Access denied. You are not a member of this group." });
      }

      // Consultas variam se for Admin (vê tudo de todos) ou Membro (vê os que participa)
      const flightFilter: any = { groupId };
      if (!isAdmin) {
        flightFilter.OR = [
          { creatorId: dbUser?.id || "" },
          { passengers: { some: { user: { email: req.user.email } } } }
        ];
      }

      const [destinations, itinerary, flights, stays, expenses, group, carRentals, insurances] = await Promise.all([
        prisma.destination.findMany({ where: { groupId }, include: { votes: true } }),
        prisma.itineraryItem.findMany({ where: { groupId }, orderBy: [{ date: "asc" }, { time: "asc" }] }),
        prisma.flight.findMany({
          where: flightFilter,
          include: { passengers: { include: { user: { select: { id: true, name: true, email: true } } } } },
          orderBy: { departureTime: "asc" }
        }),
        prisma.stay.findMany({ where: { groupId }, include: { members: { include: { user: true } } }, orderBy: { checkIn: "asc" } }),
        prisma.expense.findMany({
          where: { groupId },
          include: { paidBy: true, splits: { include: { user: true } } },
          orderBy: { date: "desc" },
        }),
        prisma.group.findUnique({
          where: { id: groupId },
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          }
        }),
        prisma.carRental.findMany({ where: { groupId }, include: { members: { include: { user: true } } }, orderBy: { pickupTime: "asc" } }),
        prisma.insurance.findMany({ where: { groupId }, orderBy: { startDate: "asc" } }),
      ]);

      const formattedExpenses = expenses.map((exp) => ({
        id: exp.id,
        description: exp.description,
        amount: exp.amount,
        date: exp.date.toISOString(),
        payers: [{ userId: exp.paidById, userName: exp.paidBy.name || exp.paidBy.email, amount: exp.amount }],
        splits: exp.splits.map((s) => ({
          userId: s.userId,
          userName: s.user.name || s.user.email,
          amount: s.amount,
          shares: s.shares,
          isPaid: s.isPaid,
        })),
      }));

      const formattedDestinations = destinations.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        image: d.image,
        votes: d.votes.reduce((sum, v) => sum + v.value, 0),
        userVote: d.votes.find(v => v.userId === dbUser?.id)?.value || 0
      }));

      const formattedMembers = group?.members.map(m => ({
        id: m.user.id,
        name: m.user.name || m.user.email,
        email: m.user.email,
        role: m.role
      })) || [];

      res.json({
        destinations: formattedDestinations,
        itinerary,
        flights,
        stays,
        carRentals,
        insurances,
        expenses: formattedExpenses,
        members: formattedMembers
      });
    } catch (err) {
      console.error("Error fetching group aggregate data:", err);
      res.status(500).json({ error: "Failed to fetch group data" });
    }
  });

  // ─── Destination Endpoints ─────────────────────────────────────────────────
  app.get("/api/groups/:groupId/destinations", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: dbUser?.id || "", groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });

      const destinations = await prisma.destination.findMany({
        where: { groupId }, include: { votes: true }, orderBy: { id: "asc" },
      });
      const formatted = destinations.map((dest) => ({
        id: dest.id,
        name: dest.name,
        description: dest.description,
        image: dest.image,
        status: dest.status,
        votes: dest.votes.reduce((sum, v) => sum + v.value, 0),
        userVote: dbUser ? (dest.votes.find((v) => v.userId === dbUser.id)?.value || 0) : 0,
      }));
      res.json(formatted);
    } catch (err) {
      console.error("Error fetching destinations:", err);
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  app.post("/api/groups/:groupId/destinations", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { name, description, image } = req.body;
    const defaultImage = "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=1470&auto=format&fit=crop";
    const destImage = image || defaultImage;

    try {
      const isAdmin = req.user.role === "ADMIN";
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      if (!dbUser) return res.status(401).json({ error: "Unauthorized" });

      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: dbUser.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });

      const newDest = await prisma.destination.create({
        data: { groupId, name, description, image: destImage, suggestedBy: dbUser.id },
      });
      await prisma.vote.create({ data: { userId: dbUser.id, destinationId: newDest.id, value: 1 } });
      res.json({
        id: newDest.id, name: newDest.name, description: newDest.description,
        image: newDest.image,
        status: newDest.status, votes: 1, userVote: 1,
      });
    } catch (err) {
      console.error("Error creating destination:", err);
      res.status(500).json({ error: "Failed to create destination" });
    }
  });

  app.patch("/api/destinations/:id/image", authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { image } = req.body;

    try {
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      if (!dbUser) return res.status(401).json({ error: "Unauthorized" });

      const defaultImage = "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=1470&auto=format&fit=crop";
      const destImage = image || defaultImage;

      const updatedDest = await prisma.destination.update({
        where: { id },
        data: { image: destImage }
      });
      res.json(updatedDest);
    } catch (err) {
      console.error("Error updating destination image:", err);
      res.status(500).json({ error: "Failed to update destination image" });
    }
  });

  app.post("/api/destinations/:destId/vote", authenticate, async (req: any, res) => {
    const { destId } = req.params;
    const { value } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email: req.user.email } });
      if (!user) return res.status(404).json({ error: "User not found" });

      if (value === 0) {
        await prisma.vote.deleteMany({ where: { userId: user.id, destinationId: destId } });
      } else {
        // Apenas permitir valor 1 (voto positivo)
        const voteValue = 1;
        await prisma.vote.upsert({
          where: { userId_destinationId: { userId: user.id, destinationId: destId } },
          update: { value: voteValue },
          create: { userId: user.id, destinationId: destId, value: voteValue },
        });
      }
      const dest = await prisma.destination.findUnique({ where: { id: destId }, include: { votes: true } });
      res.json({ votes: dest?.votes.reduce((s, v) => s + v.value, 0) || 0, userVote: value });
    } catch (err) {
      console.error("Error voting:", err);
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  // ─── Itinerary Endpoints ───────────────────────────────────────────────────
  app.get("/api/groups/:groupId/itinerary", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });

      const items = await prisma.itineraryItem.findMany({
        where: { groupId },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      });
      res.json(items);
    } catch {
      res.status(500).json({ error: "Failed to fetch itinerary" });
    }
  });

  app.post("/api/groups/:groupId/itinerary", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { title, time, location, date, type } = req.body;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });
      const item = await prisma.itineraryItem.create({
        data: { groupId, title, time: time || null, location: location || null, date: new Date(date.includes("T") ? date : date + "T12:00:00Z"), type: type || "activity" },
      });
      res.json(item);
    } catch (err) {
      console.error("Error creating itinerary item:", err);
      res.status(500).json({ error: "Failed to create itinerary item" });
    }
  });

  app.delete("/api/itinerary/:itemId", authenticate, async (req, res) => {
    const { itemId } = req.params;
    try {
      await prisma.itineraryItem.delete({ where: { id: itemId } });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete itinerary item" });
    }
  });

  app.delete("/api/groups/:groupId/itinerary/day", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { date } = req.query as { date: string };
    try {
      const targetDate = new Date(date.includes("T") ? date : `${date}T12:00:00Z`);
      const start = new Date(targetDate); start.setUTCHours(0, 0, 0, 0);
      const end = new Date(targetDate); end.setUTCHours(23, 59, 59, 999);
      await prisma.itineraryItem.deleteMany({ where: { groupId, date: { gte: start, lte: end } } });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete day" });
    }
  });

  // ─── Flight Endpoints ──────────────────────────────────────────────────────
  app.get("/api/groups/:groupId/flights", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: dbUser?.id || "", groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });

      const flightFilter: any = { groupId };
      if (!isAdmin) {
        flightFilter.OR = [
          { creatorId: dbUser?.id },
          { passengers: { some: { userId: dbUser?.id } } }
        ];
      }

      const flights = await prisma.flight.findMany({
        where: flightFilter,
        include: { passengers: { include: { user: { select: { id: true, name: true, email: true } } } } },
        orderBy: { departureTime: "asc" }
      });
      res.json(flights);
    } catch { res.status(500).json({ error: "Failed to fetch flights" }); }
  });

  app.post("/api/groups/:groupId/flights", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { number, airline, departureTime, arrivalTime, origin, destination, isRoundTrip, returnFlight, boardingPassUrl, rBoardingPassUrl, identityDocUrl, rIdentityDocUrl } = req.body;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      if (!dbUser) return res.status(401).json({ error: "User not found" });

      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: dbUser.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });

      const flightsToCreate = [];

      // Voo de ida
      const flight1 = await prisma.flight.create({
        data: {
          groupId,
          creatorId: dbUser.id,
          number,
          airline,
          departureTime: departureTime ? new Date(departureTime) : null,
          arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
          origin,
          destination,
          passengers: {
            create: {
              userId: dbUser.id,
              boardingPassUrl: boardingPassUrl || null,
              identityDocUrl: identityDocUrl || null,
            }
          }
        },
        include: { passengers: true }
      });
      flightsToCreate.push(flight1);

      // Voo de volta opcional
      if (isRoundTrip && returnFlight) {
        const flight2 = await prisma.flight.create({
          data: {
            groupId,
            creatorId: dbUser.id,
            number: returnFlight.number,
            airline: returnFlight.airline,
            departureTime: returnFlight.departureTime ? new Date(returnFlight.departureTime) : null,
            arrivalTime: returnFlight.arrivalTime ? new Date(returnFlight.arrivalTime) : null,
            origin: returnFlight.origin,
            destination: returnFlight.destination,
            passengers: {
              create: {
                userId: dbUser.id,
                boardingPassUrl: rBoardingPassUrl || null,
                identityDocUrl: rIdentityDocUrl || null,
              }
            }
          },
          include: { passengers: true }
        });
        flightsToCreate.push(flight2);
      }

      res.json(flightsToCreate);
    } catch (err) {
      console.error("Error creating flight(s):", err);
      res.status(500).json({ error: "Failed to create flight(s)" });
    }
  });

  app.post("/api/flights/:flightId/share", authenticate, async (req: any, res) => {
    const { flightId } = req.params;
    const { userId, boardingPassUrl } = req.body;
    try {
      const passenger = await prisma.flightPassenger.create({
        data: {
          flightId,
          userId,
          boardingPassUrl: boardingPassUrl || null
        },
        include: { user: { select: { id: true, name: true, email: true } } }
      });
      res.json(passenger);
    } catch (err) {
      console.error("Error sharing flight:", err);
      res.status(500).json({ error: "Failed to share flight" });
    }
  });

  app.patch("/api/flights/passengers/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { boardingPassUrl, identityDocUrl } = req.body;
    try {
      const updated = await prisma.flightPassenger.update({
        where: { id },
        data: { boardingPassUrl, identityDocUrl }
      });
      res.json(updated);
    } catch { res.status(500).json({ error: "Failed to update passenger" }); }
  });

  app.patch("/api/flights/:flightId", authenticate, async (req: any, res) => {
    const { flightId } = req.params;
    const { number, airline, departureTime, arrivalTime, origin, destination, boardingPassUrl, identityDocUrl } = req.body;
    const userId = req.user.id;
    try {
      const flight = await prisma.flight.update({
        where: { id: flightId },
        data: {
          number, airline, origin, destination,
          departureTime: departureTime ? new Date(departureTime) : null,
          arrivalTime: arrivalTime ? new Date(arrivalTime) : null
        },
        include: { passengers: { include: { user: true } } }
      });

      // Atualiza documentos do passageiro atual se enviados
      if (boardingPassUrl !== undefined || identityDocUrl !== undefined) {
        await prisma.flightPassenger.updateMany({
          where: { flightId, userId },
          data: {
            ...(boardingPassUrl !== undefined && { boardingPassUrl }),
            ...(identityDocUrl !== undefined && { identityDocUrl })
          }
        });

        const updatedFlight = await prisma.flight.findUnique({
          where: { id: flightId },
          include: { passengers: { include: { user: { select: { id: true, name: true, email: true } } } } }
        });
        return res.json(updatedFlight);
      }

      res.json(flight);
    } catch (err) { res.status(500).json({ error: "Failed to update flight" }); }
  });

  app.delete("/api/flights/:flightId", authenticate, async (req, res) => {
    const { flightId } = req.params;
    try {
      await prisma.flight.delete({ where: { id: flightId } });
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Failed to delete flight" }); }
  });

  // ─── Stay Endpoints ────────────────────────────────────────────────────────
  app.get("/api/groups/:groupId/stays", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });

      const stays = await prisma.stay.findMany({ where: { groupId }, orderBy: { checkIn: "asc" } });
      res.json(stays);
    } catch { res.status(500).json({ error: "Failed to fetch stays" }); }
  });

  app.post("/api/groups/:groupId/stays", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { name, address, lat, lng, googlePlaceId, checkIn, checkOut, bookingVoucherUrl } = req.body;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });
      const stay = await prisma.stay.create({
        data: {
          groupId, name, address, bookingVoucherUrl,
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
        },
        include: { members: { include: { user: true } } }
      });
      res.json(stay);
    } catch (err) {
      console.error("Error creating stay:", err);
      res.status(500).json({ error: "Failed to create stay" });
    }
  });

  app.patch("/api/stays/:stayId", authenticate, async (req, res) => {
    const { stayId } = req.params;
    const { name, address, lat, lng, googlePlaceId, checkIn, checkOut, bookingVoucherUrl } = req.body;
    try {
      const dataToUpdate: any = {};
      if (name !== undefined) dataToUpdate.name = name;
      if (address !== undefined) dataToUpdate.address = address;
      if (lat !== undefined) dataToUpdate.lat = lat;
      if (lng !== undefined) dataToUpdate.lng = lng;
      if (googlePlaceId !== undefined) dataToUpdate.googlePlaceId = googlePlaceId;
      if (bookingVoucherUrl !== undefined) dataToUpdate.bookingVoucherUrl = bookingVoucherUrl;
      if (checkIn !== undefined) dataToUpdate.checkIn = checkIn ? new Date(checkIn) : null;
      if (checkOut !== undefined) dataToUpdate.checkOut = checkOut ? new Date(checkOut) : null;

      const stay = await prisma.stay.update({
        where: { id: stayId },
        data: dataToUpdate,
        include: { members: { include: { user: true } } }
      });
      res.json(stay);
    } catch { res.status(500).json({ error: "Failed to update stay" }); }
  });

  app.post("/api/stays/:stayId/share", authenticate, async (req: any, res) => {
    const { stayId } = req.params;
    const { userId } = req.body;
    try {
      const member = await prisma.stayMember.create({
        data: { stayId, userId },
        include: { user: true }
      });
      res.json(member);
    } catch (err) {
      console.error("Error sharing stay:", err);
      res.status(500).json({ error: "Failed to share stay" });
    }
  });

  // Rota de update stay member removida pois voucher agora é no Stay


  app.delete("/api/stays/:stayId", authenticate, async (req, res) => {
    const { stayId } = req.params;
    try {
      await prisma.stay.delete({ where: { id: stayId } });
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Failed to delete stay" }); }
  });

  // ─── Car Rental Endpoints ──────────────────────────────────────────────────
  app.post("/api/groups/:groupId/rentals", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { company, model, pickupLocation, pickupTime, dropoffLocation, dropoffTime, confirmationCode, bookingVoucherUrl } = req.body;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });
      const rental = await prisma.carRental.create({
        data: {
          groupId, company, model, pickupLocation, dropoffLocation, confirmationCode, bookingVoucherUrl,
          pickupTime: pickupTime ? new Date(pickupTime) : null,
          dropoffTime: dropoffTime ? new Date(dropoffTime) : null,
        },
        include: { members: { include: { user: true } } }
      });
      res.json(rental);
    } catch (err) {
      console.error("Error creating car rental:", err);
      res.status(500).json({ error: "Failed to create car rental" });
    }
  });

  app.patch("/api/rentals/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { company, model, pickupLocation, pickupTime, dropoffLocation, dropoffTime, confirmationCode, bookingVoucherUrl } = req.body;
    try {
      const dataToUpdate: any = {};
      if (company !== undefined) dataToUpdate.company = company;
      if (model !== undefined) dataToUpdate.model = model;
      if (pickupLocation !== undefined) dataToUpdate.pickupLocation = pickupLocation;
      if (dropoffLocation !== undefined) dataToUpdate.dropoffLocation = dropoffLocation;
      if (confirmationCode !== undefined) dataToUpdate.confirmationCode = confirmationCode;
      if (bookingVoucherUrl !== undefined) dataToUpdate.bookingVoucherUrl = bookingVoucherUrl;
      if (pickupTime !== undefined) dataToUpdate.pickupTime = pickupTime ? new Date(pickupTime) : null;
      if (dropoffTime !== undefined) dataToUpdate.dropoffTime = dropoffTime ? new Date(dropoffTime) : null;

      const rental = await prisma.carRental.update({
        where: { id },
        data: dataToUpdate,
        include: { members: { include: { user: true } } }
      });
      res.json(rental);
    } catch (err) { res.status(500).json({ error: "Erro ao atualizar aluguel" }); }
  });

  app.post("/api/rentals/:id/share", authenticate, async (req: any, res) => {
    const { id: carRentalId } = req.params;
    const { userId, isDriver } = req.body;
    try {
      const member = await prisma.carRentalMember.create({
        data: { carRentalId, userId, isDriver },
        include: { user: true }
      });
      res.json(member);
    } catch (err) {
      console.error("Error sharing car rental:", err);
      res.status(500).json({ error: "Failed to share car rental" });
    }
  });

  app.patch("/api/rentals/members/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { isDriver } = req.body;
    try {
      const updated = await prisma.carRentalMember.update({
        where: { id },
        data: { isDriver }
      });
      res.json(updated);
    } catch { res.status(500).json({ error: "Failed to update car rental member" }); }
  });

  app.delete("/api/rentals/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      await prisma.carRental.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro ao deletar aluguel" });
    }
  });

  // ─── Insurance Endpoints ────────────────────────────────────────────────────
  app.post("/api/groups/:groupId/insurances", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { provider, policyNumber, startDate, endDate, contactInfo } = req.body;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });
      const insurance = await prisma.insurance.create({
        data: {
          groupId, provider, policyNumber, contactInfo,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      });
      res.json(insurance);
    } catch (err) {
      console.error("Error creating insurance:", err);
      res.status(500).json({ error: "Failed to create insurance" });
    }
  });

  app.patch("/api/insurances/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    const { provider, policyNumber, startDate, endDate, contactInfo } = req.body;
    try {
      const insurance = await prisma.insurance.update({
        where: { id },
        data: {
          provider, policyNumber, contactInfo,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null
        }
      });
      res.json(insurance);
    } catch (err) { res.status(500).json({ error: "Erro ao atualizar seguro" }); }
  });

  app.delete("/api/insurances/:id", authenticate, async (req: any, res) => {
    const { id } = req.params;
    try {
      await prisma.insurance.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro ao deletar seguro" });
    }
  });

  // ─── Expense Endpoints ─────────────────────────────────────────────────────
  app.get("/api/groups/:groupId/expenses", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const isAdmin = req.user.role === "ADMIN";
      const membership = await prisma.membership.findUnique({
        where: { userId_groupId: { userId: req.user.id, groupId } }
      });
      if (!isAdmin && !membership) return res.status(403).json({ error: "Forbidden" });

      const expenses = await prisma.expense.findMany({
        where: { groupId },
        include: { paidBy: true, splits: { include: { user: true } } },
        orderBy: { date: "desc" },
      });
      const formatted = expenses.map((exp) => ({
        id: exp.id,
        description: exp.description,
        amount: exp.amount,
        date: exp.date.toISOString(),
        payers: [{ userId: exp.paidById, userName: exp.paidBy.name || exp.paidBy.email, amount: exp.amount }],
        splits: exp.splits.map((s) => ({
          userId: s.userId,
          userName: s.user.name || s.user.email,
          amount: s.amount,
          shares: s.shares,
          isPaid: s.isPaid,
        })),
      }));
      res.json(formatted);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/groups/:groupId/expenses", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { description, amount, splits } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email: req.user.email } });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Garante que todos os usuários do split existam (mesmo os que não têm conta criada no app ainda).
      const validSplits = await Promise.all(
        splits.map(async (s: any) => {
          let splitUser = await prisma.user.findUnique({ where: { id: s.userId } });

          if (!splitUser) {
            // Cria um usuário "Dummy" para representar a pessoa que não cadastrou o e-mail,
            // vinculando ao ID informado ou a um e-mail falso
            splitUser = await prisma.user.create({
              data: {
                id: s.userId,
                name: s.userName || "Usuário Convidado",
                email: `guest_${s.userId}@gotrip.local`,
              }
            });
          }

          return {
            userId: splitUser.id,
            amount: s.amount,
            shares: s.shares || 1,
            isPaid: splitUser.id === user.id,
          };
        })
      );

      const newExpense = await prisma.expense.create({
        data: {
          groupId, description, amount, paidById: user.id,
          splits: {
            create: validSplits,
          },
        },
        include: { paidBy: true, splits: { include: { user: true } } },
      });
      res.json(newExpense);
    } catch (err) {
      console.error("Error creating expense:", err);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:expenseId/splits/:userId", authenticate, async (req: any, res) => {
    const { expenseId, userId } = req.params;
    const { isPaid } = req.body;
    try {
      const updated = await prisma.expenseSplit.update({
        where: { expenseId_userId: { expenseId, userId } },
        data: { isPaid },
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to update split" });
    }
  });

  // ─── Billing & Notifications ───────────────────────────────────────────────
  app.post("/api/billing/create-checkout", authenticate, (req, res) => {
    res.json({ url: "https://checkout.stripe.com/mock" });
  });

  app.post("/api/notifications/send", authenticate, (req, res) => {
    const { type, payload } = req.body;
    console.log(`Notification [${type}]:`, payload);
    res.json({ success: true });
  });

  // ─── Admin Endpoints ──────────────────────────────────────────────────────
  app.get("/api/admin/stats", authenticate, async (req: any, res) => {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied. Admin only." });
    }

    try {
      const [usersCount, groupsCount, totalExpenses, recentUsers, totalDestinations] = await Promise.all([
        prisma.user.count(),
        prisma.group.count(),
        prisma.expense.aggregate({ _sum: { amount: true } }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { name: true, email: true, createdAt: true }
        }),
        prisma.destination.count(),
      ]);

      res.json({
        usersCount,
        groupsCount,
        totalExpenses: totalExpenses._sum.amount || 0,
        recentUsers: recentUsers.map(u => ({
          name: u.name || u.email.split("@")[0],
          email: u.email,
          date: u.createdAt.toISOString()
        })),
        totalDestinations
      });
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ─── File Upload ────────────────────────────────────────────────────────
  app.post("/api/upload", authenticate, upload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    try {
      const file = req.file;
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExt}`;
      const folder = req.body.folder || "uploads";
      const filePath = `${folder}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("boarding-passes")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("boarding-passes")
        .getPublicUrl(filePath);

      res.json({ url: publicUrl });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Erro ao fazer upload do arquivo: " + err.message });
    }
  });

  // ─── Vite / Static ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`goTrip Server running on:`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://0.0.0.0:${PORT}`);
  });
}

startServer();
