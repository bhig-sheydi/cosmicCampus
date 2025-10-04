import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/supabaseClient";
import { useUser } from "../components/Contexts/userContext";

const PAGE_SIZE = 10;

const Aray = () => {
  const { userData } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const observer = useRef();
  const navigate = useNavigate();


  const deriveTypeFromMessage = (message) => {
  if (message === "your little one has got assignment") return "homework";
  if (message.includes("friend")) return "friend-request";
  if (message.includes("live")) return "live-notification";
  if (message.includes("poke")) return "poke";
  return "general";
};



  const lastNotificationRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchNotifications();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );




  const getBadgeStyle = (type) => {
    switch (type) {
      case "friend-request":
        return "bg-blue-500 text-white";
      case "live-notification":
        return "bg-green-500 text-white";
      case "poke":
        return "bg-purple-500 text-white";
      case "homework":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };


  const fetchNotifications = async () => {
    if (!userData?.user_id || loading) return;

    setLoading(true);

    const { data: childClasses, error: classError } = await supabase
      .from("guardian_children")
      .select(`child_id, students:child_id (class_id)`)
      .eq("guardian_name", userData.user_id);

    if (classError || !childClasses) {
      console.error("Error fetching children classes:", classError?.message);
      setLoading(false);
      return;
    }

    const classIds = childClasses
      .map((entry) => entry.students?.class_id)
      .filter(Boolean);

    if (classIds.length === 0) {
      setHasMore(false);
      setLoading(false);
      return;
    }

    const { data: notifData, error: notifError } = await supabase
      .from("notifications")
      .select(`
        id,
        message,
        created_at,
        trigger_id,
        class_id,
        profiles:trigger_id (name)
      `)
      .in("class_id", classIds)
      .order("created_at", { ascending: false })
      .range(offsetRef.current, offsetRef.current + PAGE_SIZE - 1);

    if (notifError) {
      console.error("Error fetching notifications:", notifError.message);
      setHasMore(false);
    } else {
      const newMapped = notifData.map((item) => ({
        id: item.id,
        name: `From ${item.profiles?.name || "Unknown"}`,
        message: item.message,
        type: deriveTypeFromMessage(item.message),
      }));

      setNotifications((prev) => [...prev, ...newMapped]);
      if (notifData.length < PAGE_SIZE) setHasMore(false);
      offsetRef.current += PAGE_SIZE;
    }

    setLoading(false);
  };

  useEffect(() => {
    offsetRef.current = 0;
    setNotifications([]);
    setHasMore(true);
    fetchNotifications();
  }, [userData?.user_id]);

  return (
    <div className="w-full flex items-center justify-center min-h-screen flex-col bg-gray-100 p-4 dark:bg-gray-900">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Notifications
      </h1>
      <div className="w-full max-w-md space-y-4">
        {notifications.length === 0 && !loading && (
          <p className="text-gray-600 dark:text-gray-400">No notifications found.</p>
        )}
        {notifications.map((notification, index) => {
          const isLast = index === notifications.length - 1;
          return (
            <Card
              key={notification.id}
              ref={isLast ? lastNotificationRef : null}
              className="border border-gray-300 shadow-sm dark:border-gray-700"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {notification.name}
                  <Badge className={`rounded-full px-2 py-1 ${getBadgeStyle(notification.type)}`}>
                    {notification.type.replace("-", " ")}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                  {notification.message}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-right">
                <button
                  className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all"
                  onClick={() => {
                    if (notification.type === "homework") {
                      navigate("/dashboard/childshomework");
                    } else {
                      console.log("Default view clicked"); // Or open a modal, etc.
                    }
                  }}
                >
                  View
                </button>
              </CardContent>

            </Card>
          );
        })}
        {loading && <p className="text-gray-600 dark:text-gray-400">Loading more...</p>}
      </div>
    </div>
  );
};

export default Aray;
