
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useState } from "react";

export default function CommunicationsPage() {
  const [message, setMessage] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string>();
  const [targetLanguage, setTargetLanguage] = useState<string>();

  const { data: properties } = useQuery({
    queryKey: ["/api/properties"],
  });

  const sendNotification = async () => {
    await fetch("/api/communications/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: selectedProperty,
        message,
        translateTo: targetLanguage
      }),
    });
    setMessage("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Communications</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Send Mass Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select 
              value={selectedProperty}
              onValueChange={setSelectedProperty}
              placeholder="Select Property"
            >
              {properties?.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            
            <Select
              value={targetLanguage}
              onValueChange={setTargetLanguage}
              placeholder="Target Language (Optional)"
            >
              <option value="es">Spanish</option>
              <option value="zh">Chinese</option>
              <option value="pl">Polish</option>
            </Select>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={4}
            />

            <Button onClick={sendNotification}>
              Send Notification
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
