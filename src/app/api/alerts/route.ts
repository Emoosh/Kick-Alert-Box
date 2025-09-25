// src/app/api/alerts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TokenManager } from "@/lib/auth/tokenManager";
import { AlertService } from "@/lib/services/alert-service";
import { UserService } from "@/lib/services/user-service";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const sessionUserId = await TokenManager.getUserIdFromSession(sessionToken);
    if (!sessionUserId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = await UserService.getUserBySessionId(sessionUserId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Sadece database'den alert'leri getir
    const alerts = await AlertService.getUserAlerts(user.id);
    const activeAlertCount = await AlertService.getActiveAlertCount(user.id);

    return NextResponse.json({
      alerts,
      activeAlertCount,
      user: {
        id: user.id,
        username: user.username,
        kickUserId: user.kickUserId,
      },
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Yeni alert oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, username, message, amount, data } = body;

    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const sessionUserId = await TokenManager.getUserIdFromSession(sessionToken);
    if (!sessionUserId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = await UserService.getUserBySessionId(sessionUserId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const alert = await AlertService.createAlert({
      userId: user.id,
      type,
      username: username || user.username,
      message,
      amount,
      data,
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Error creating alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Alert güncelle/sil
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, ...updateData } = body;

    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const sessionUserId = await TokenManager.getUserIdFromSession(sessionToken);
    if (!sessionUserId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = await UserService.getUserBySessionId(sessionUserId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedAlert = await AlertService.updateAlert(
      alertId,
      user.id,
      updateData
    );

    return NextResponse.json({ alert: updatedAlert });
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get("id");

    if (!alertId) {
      return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
    }

    const sessionToken = request.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const sessionUserId = await TokenManager.getUserIdFromSession(sessionToken);
    if (!sessionUserId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = await UserService.getUserBySessionId(sessionUserId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await AlertService.deleteAlert(alertId, user.id);

    return NextResponse.json({ message: "Alert deleted successfully" });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
