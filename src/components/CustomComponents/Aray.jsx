import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Aray = () => {
  const notifications = [
    { name: "Solomon", message: "You have a friend request", type: "friend-request" },
    { name: "Fred", message: "I am live", type: "live-notification" },
    { name: "Gift", message: "Shelly poked you", type: "poke" },
  ];

  // Define styles or badges based on notification type
  const getBadgeStyle = (type) => {
    switch (type) {
      case "friend-request":
        return "bg-blue-500 text-white";
      case "live-notification":
        return "bg-green-500 text-white";
      case "poke":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="w-full flex items-center justify-center h-screen flex-col bg-gray-100 p-4 dark:bg-gray-900">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Notifications</h1>
      <div className="w-full max-w-md space-y-4">
        {notifications.map((notification, index) => (
          <Card key={index} className="border border-gray-300 shadow-sm dark:border-gray-700">
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
              <button className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all">
                View
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Aray;
