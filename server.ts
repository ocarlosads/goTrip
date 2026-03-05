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
  app.post("/api/auth/login", async (req, res) => {
    const { email } = req.body;
    try {
      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name: email.split("@")[0] },
      });
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ user: { email, id: dbUser.id }, token });
    } catch (err) {
      console.error("Login error:", err);
      // Fallback sem banco
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ user: { email }, token });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("auth_token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    try {
      const dbUser = await prisma.user.findUnique({ where: { email: req.user.email } });
      res.json({ user: { email: req.user.email, id: dbUser?.id || null } });
    } catch {
      res.json({ user: req.user });
    }
  });

  // ─── Group Endpoints ───────────────────────────────────────────────────────
  app.post("/api/groups", authenticate, async (req: any, res) => {
    const { name, description, type } = req.body;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const user = await prisma.user.upsert({
        where: { email: req.user.email },
        update: {},
        create: { email: req.user.email, name: req.user.email.split("@")[0] },
      });
      const newGroup = await prisma.group.create({
        data: {
          name, description, type: type || "group", inviteCode, ownerId: user.id,
          members: { create: { userId: user.id, role: "OWNER" } },
        },
      });
      res.json({ ...newGroup, memberCount: 1, userBalance: 0, image: `https://picsum.photos/seed/${encodeURIComponent(name)}/400/200` });
    } catch (err) {
      console.error("Error creating group:", err);
      res.status(500).json({ error: "Failed to create group" });
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

  app.get("/api/groups", authenticate, async (req: any, res) => {
    try {
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
        image: `https://picsum.photos/seed/${encodeURIComponent(m.group.name)}/400/200`,
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

  // ─── Destination Endpoints ─────────────────────────────────────────────────
  app.get("/api/groups/:groupId/destinations", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
      const user = await prisma.user.findUnique({ where: { email: req.user.email } });
      const destinations = await prisma.destination.findMany({
        where: { groupId }, include: { votes: true }, orderBy: { id: "asc" },
      });
      const formatted = destinations.map((dest) => ({
        id: dest.id,
        name: dest.name,
        description: dest.description,
        image: dest.image || `https://picsum.photos/seed/${encodeURIComponent(dest.name)}/600/300`,
        status: dest.status,
        votes: dest.votes.reduce((sum, v) => sum + v.value, 0),
        userVote: user ? (dest.votes.find((v) => v.userId === user.id)?.value || 0) : 0,
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
    try {
      const user = await prisma.user.upsert({
        where: { email: req.user.email },
        update: {},
        create: { email: req.user.email, name: req.user.email.split("@")[0] },
      });
      const dest = await prisma.destination.create({
        data: { groupId, name, description, image: image || null, suggestedBy: user.id },
      });
      await prisma.vote.create({ data: { userId: user.id, destinationId: dest.id, value: 1 } });
      res.json({
        id: dest.id, name: dest.name, description: dest.description,
        image: dest.image || `https://picsum.photos/seed/${encodeURIComponent(dest.name)}/600/300`,
        status: dest.status, votes: 1, userVote: 1,
      });
    } catch (err) {
      console.error("Error creating destination:", err);
      res.status(500).json({ error: "Failed to create destination" });
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
        await prisma.vote.upsert({
          where: { userId_destinationId: { userId: user.id, destinationId: destId } },
          update: { value },
          create: { userId: user.id, destinationId: destId, value },
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
      const item = await prisma.itineraryItem.create({
        data: { groupId, title, time: time || null, location: location || null, date: new Date(date), type: type || "activity" },
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
      const start = new Date(date); start.setUTCHours(0, 0, 0, 0);
      const end = new Date(date); end.setUTCHours(23, 59, 59, 999);
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
      const flights = await prisma.flight.findMany({ where: { groupId }, orderBy: { departureTime: "asc" } });
      res.json(flights);
    } catch { res.status(500).json({ error: "Failed to fetch flights" }); }
  });

  app.post("/api/groups/:groupId/flights", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { number, airline, departureTime, arrivalTime, origin, destination } = req.body;
    try {
      const flight = await prisma.flight.create({
        data: {
          groupId, number, airline,
          departureTime: departureTime ? new Date(departureTime) : null,
          arrivalTime: arrivalTime ? new Date(arrivalTime) : null,
          origin, destination,
        },
      });
      res.json(flight);
    } catch (err) {
      console.error("Error creating flight:", err);
      res.status(500).json({ error: "Failed to create flight" });
    }
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
      const stays = await prisma.stay.findMany({ where: { groupId }, orderBy: { checkIn: "asc" } });
      res.json(stays);
    } catch { res.status(500).json({ error: "Failed to fetch stays" }); }
  });

  app.post("/api/groups/:groupId/stays", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    const { name, address, checkIn, checkOut } = req.body;
    try {
      const stay = await prisma.stay.create({
        data: {
          groupId, name, address,
          checkIn: checkIn ? new Date(checkIn) : null,
          checkOut: checkOut ? new Date(checkOut) : null,
        },
      });
      res.json(stay);
    } catch (err) {
      console.error("Error creating stay:", err);
      res.status(500).json({ error: "Failed to create stay" });
    }
  });

  app.delete("/api/stays/:stayId", authenticate, async (req, res) => {
    const { stayId } = req.params;
    try {
      await prisma.stay.delete({ where: { id: stayId } });
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Failed to delete stay" }); }
  });

  // ─── Expense Endpoints ─────────────────────────────────────────────────────
  app.get("/api/groups/:groupId/expenses", authenticate, async (req: any, res) => {
    const { groupId } = req.params;
    try {
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

      const newExpense = await prisma.expense.create({
        data: {
          groupId, description, amount, paidById: user.id,
          splits: {
            create: splits.map((s: any) => ({
              userId: s.userId,
              amount: s.amount,
              shares: s.shares || 1,
              isPaid: s.userId === user.id,
            })),
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

  // ─── Vite / Static ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CheckTrip Server running on http://localhost:${PORT}`);
  });
}

startServer();
