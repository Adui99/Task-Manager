import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  await dbConnect();
  try {
    const { title, description } = await req.json();
    
    // Fetch all users except admin to analyze
    const users = await User.find({ role: { $ne: "admin" } }).select("_id name skills");
    
    if (users.length === 0) {
      return NextResponse.json({ message: "Không có user nào để gán" }, { status: 400 });
    }

    // MVP Mock AI Logic for Auto-Assigner
    // Uses simple keyword matching against skills as a fallback for Antigravity AI Orchestration
    const textToAnalyze = `${title} ${description || ""}`.toLowerCase();
    
    const matchedUsers: Array<{ user: any, matches: number }> = [];

    for (const user of users) {
      let matches = 0;
      if (user.skills && Array.isArray(user.skills)) {
        for (const skill of user.skills) {
          if (textToAnalyze.includes(skill.toLowerCase())) {
            matches++;
          }
        }
      }
      if (matches > 0) {
        matchedUsers.push({ user, matches });
      }
    }

    let finalAssignees: any[] = [];
    let reason = "";
    let names = "";

    if (matchedUsers.length > 0) {
      matchedUsers.sort((a, b) => b.matches - a.matches);
      finalAssignees = matchedUsers.map(m => m.user._id);
      names = matchedUsers.map(m => m.user.name).join(", ");
      reason = `Có ${matchedUsers.length} người có kỹ năng phù hợp với yêu cầu: ` + 
               matchedUsers.map(m => `${m.user.name} (Match: ${m.matches})`).join(", ");
    } else {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      finalAssignees = [randomUser._id];
      names = randomUser.name;
      reason = "Gợi ý ngẫu nhiên do không tìm thấy kỹ năng khớp";
    }

    return NextResponse.json({
      assignees: finalAssignees,
      name: names,
      reason
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
