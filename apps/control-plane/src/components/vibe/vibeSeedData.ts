import { assertNoDemoDataForRealProject } from "@/services/demoMode";

export const vibeSidebarNav = ["Home", "Projects", "Templates", "Design Studio", "Brand Kit", "Launch", "Learn"];

export const recentProjects: { name: string; updated: string }[] = [];

export const suggestionChips = [
  "Make it more minimal",
  "Change the color to emerald",
  "Add a video background",
  "Improve mobile view",
  "Add testimonials",
];

export const actionChips = ["Improve Design", "Add Page", "Add Feature", "Connect Payments", "Run Tests", "Launch App"];

const demoBuildMapItems = [
  { task: "Create homepage", status: "Complete" },
  { task: "Design room listing page", status: "Complete" },
  { task: "Add booking flow", status: "In Progress" },
  { task: "Build backend", status: "Pending" },
  { task: "Connect database", status: "Pending" },
  { task: "Payment integration", status: "Pending" },
  { task: "Testing & optimization", status: "Pending" },
];

export const buildMapItems = assertNoDemoDataForRealProject(demoBuildMapItems, [] as { task: string; status: string }[]);

const demoRecentActivity = [
  { item: "Homepage design updated", time: "10:24 AM" },
  { item: "Room listing page created", time: "10:18 AM" },
  { item: "Booking flow designed", time: "10:12 AM" },
  { item: "Project created", time: "10:00 AM" },
];

export const recentActivity = assertNoDemoDataForRealProject(demoRecentActivity, [] as { item: string; time: string }[]);
