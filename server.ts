import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { prisma } from "./src/lib/prisma";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "checktrip-secret-key-123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  console.log("DATABASE_URL defined:", !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    let dbUrl = process.env.DATABASE_URL.trim();
    if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
      dbUrl = dbUrl.substring(1, dbUrl.length - 1);
    }
    if (dbUrl.startsWith("'") && dbUrl.endsWith("'")) {
      dbUrl = dbUrl.substring(1, dbUrl.length - 1);
    }
    process.env.DATABASE_URL = dbUrl;
    
    console.log("DATABASE_URL length:", dbUrl.length);
    console.log("DATABASE_URL starts with postgresql://:", dbUrl.startsWith("postgresql://"));
    console.log("DATABASE_URL starts with postgres://:", dbUrl.startsWith("postgres://"));
    console.log("DATABASE_URL first 10 chars:", dbUrl.substring(0, 10));
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    let token = req.cookies.auth_token;
    
    // Also check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    console.log("Authenticating request. Token present:", !!token);
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      console.log("Authenticated user:", req.user.email);
      next();
    } catch (err) {
      console.error("Auth error:", err);
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Endpoints
  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    // Simple mock login for now - in a real app, use Resend for magic links
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user: { email }, token });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, (req: any, res) => {
    res.json({ user: req.user });
  });

  // Group Endpoints
  app.post("/api/groups", authenticate, async (req: any, res) => {
    const { name, description, type } = req.body;
    console.log("Creating group:", { name, type, user: req.user.email });
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      // Find or create user in DB
      console.log("Upserting user...");
      const user = await prisma.user.upsert({
        where: { email: req.user.email },
        update: {},
        create: { email: req.user.email, name: req.user.email.split('@')[0] },
      });
      console.log("User upserted:", user.id);

      const newGroup = await prisma.group.create({
        data: {
          name,
          description,
          type: type || "group",
          inviteCode,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              role: "OWNER"
            }
          }
        }
      });
      
      res.json({
        ...newGroup,
        memberCount: 1,
        userBalance: 0,
        image: `https://picsum.photos/seed/${name}/400/200`
      });
    } catch (err) {
      console.error("Error creating group:", err);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  app.get("/api/groups/invite/:code", async (req, res) => {
    const { code } = req.params;
    try {
      const group = await prisma.group.findUnique({
        where: { inviteCode: code },
        include: { owner: true }
      });
      
      if (!group) return res.status(404).json({ error: "Group not found" });

      res.json({
        name: group.name,
        description: group.description,
        owner: group.owner.name || group.owner.email
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });

  app.post("/api/groups/join/:code", authenticate, async (req: any, res) => {
    const { code } = req.params;
    console.log("Joining group with code:", code, "User:", req.user.email);
    try {
      const group = await prisma.group.findUnique({
        where: { inviteCode: code }
      });
      console.log("Group found:", !!group);

      if (!group) return res.status(404).json({ error: "Group not found" });

      console.log("Upserting user...");
      const user = await prisma.user.upsert({
        where: { email: req.user.email },
        update: {},
        create: { email: req.user.email, name: req.user.email.split('@')[0] },
      });
      console.log("User upserted:", user.id);

      // Check if already a member
      const existingMembership = await prisma.membership.findUnique({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: group.id
          }
        }
      });

      if (existingMembership) {
        return res.json({ message: "Already a member", group });
      }

      await prisma.membership.create({
        data: {
          userId: user.id,
          groupId: group.id,
          role: "MEMBER"
        }
      });

      res.json({ message: "Joined successfully", group });
    } catch (err) {
      res.status(500).json({ error: "Failed to join group" });
    }
  });

  app.get("/api/groups", authenticate, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: req.user.email },
        include: {
          memberships: {
            include: {
              group: {
                include: {
                  members: true
                }
              }
            }
          }
        }
      });

      if (!user) return res.json([]);

      const groups = user.memberships.map(m => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
        type: m.group.type,
        inviteCode: m.group.inviteCode,
        memberCount: m.group.members.length,
        userBalance: 0, // In a real app, calculate this from expenses
        image: `https://picsum.photos/seed/${m.group.name}/400/200`
      }));

      res.json(groups);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch groups" });
    }
  });

  // Expense Endpoints
  app.get("/api/groups/:groupId/expenses", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const expenses = await prisma.expense.findMany({
        where: { groupId },
        include: {
          paidBy: true,
          splits: {
            include: {
              user: true
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      const formattedExpenses = expenses.map(exp => ({
        id: exp.id,
        description: exp.description,
        amount: exp.amount,
        date: exp.date.toISOString(),
        payers: [{ userId: exp.paidById, userName: exp.paidBy.name || exp.paidBy.email, amount: exp.amount }],
        splits: exp.splits.map(s => ({
          userId: s.userId,
          userName: s.user.name || s.user.email,
          amount: s.amount,
          shares: s.shares,
          isPaid: s.isPaid
        }))
      }));

      res.json(formattedExpenses);
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

      const newExpense = await prisma.expense.create({
        data: {
          groupId,
          description,
          amount,
          paidById: user.id,
          splits: {
            create: splits.map((s: any) => ({
              userId: s.userId,
              amount: s.amount,
              shares: s.shares || 1,
              isPaid: s.userId === user.id // Paid by default if the payer is the same
            }))
          }
        },
        include: {
          paidBy: true,
          splits: {
            include: {
              user: true
            }
          }
        }
      });

      res.json(newExpense);
    } catch (err) {
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:expenseId/splits/:userId", authenticate, async (req: any, res) => {
    const { expenseId, userId } = req.params;
    const { isPaid } = req.body;

    try {
      const updatedSplit = await prisma.expenseSplit.update({
        where: {
          expenseId_userId: {
            expenseId,
            userId
          }
        },
        data: { isPaid }
      });
      res.json(updatedSplit);
    } catch (err) {
      res.status(500).json({ error: "Failed to update split" });
    }
  });

  // Stripe Endpoints
  app.post("/api/billing/create-checkout", authenticate, (req, res) => {
    res.json({ url: "https://checkout.stripe.com/mock" });
  });

  // Notification Endpoints
  app.post("/api/notifications/send", authenticate, (req, res) => {
    const { type, payload } = req.body;
    console.log(`Enviando notificação do tipo ${type}:`, payload);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CheckTrip Server running on http://localhost:${PORT}`);
  });
}

startServer();
