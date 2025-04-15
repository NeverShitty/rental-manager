
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MaintenanceRequest, Property, User } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function MaintenancePage() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newNote, setNewNote] = useState("");

  const { data: requests } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateRequest = useMutation({
    mutationFn: async (data: Partial<MaintenanceRequest>) => {
      const response = await fetch(`/api/maintenance/${selectedRequest?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Request updated successfully" });
      setIsEditing(false);
    },
  });

  const addPhoto = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const response = await fetch(`/api/maintenance/${selectedRequest?.id}/photos`, {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Photo added successfully" });
      setNewPhoto(null);
    },
  });

  const addNote = useMutation({
    mutationFn: async (note: string) => {
      const response = await fetch(`/api/maintenance/${selectedRequest?.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Note added successfully" });
      setNewNote("");
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Maintenance Requests</h1>
          <p className="text-muted-foreground">
            View and manage maintenance requests across properties.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Property/Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>
                      {properties?.find(p => p.id === request.propertyId)?.name}
                      {request.unitId && ` - Unit ${request.unitId}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {request.dueDate && new Date(request.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {users?.find(u => u.id === request.assignedTo)?.fullName}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            onClick={() => setSelectedRequest(request)}
                          >
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Maintenance Request Details</DialogTitle>
                          </DialogHeader>
                          {selectedRequest && (
                            <div className="space-y-4 pt-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Title</Label>
                                  {isEditing ? (
                                    <Input 
                                      value={selectedRequest.title}
                                      onChange={(e) => setSelectedRequest({
                                        ...selectedRequest,
                                        title: e.target.value
                                      })}
                                    />
                                  ) : (
                                    <p>{selectedRequest.title}</p>
                                  )}
                                </div>
                                <div>
                                  <Label>Property/Unit</Label>
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <Select
                                        value={selectedRequest.propertyId?.toString()}
                                        onValueChange={(value) => setSelectedRequest({
                                          ...selectedRequest,
                                          propertyId: parseInt(value)
                                        })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select property" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {properties?.map(property => (
                                            <SelectItem 
                                              key={property.id} 
                                              value={property.id.toString()}
                                            >
                                              {property.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Input 
                                        placeholder="Unit number"
                                        value={selectedRequest.unitId || ''}
                                        onChange={(e) => setSelectedRequest({
                                          ...selectedRequest,
                                          unitId: e.target.value
                                        })}
                                      />
                                    </div>
                                  ) : (
                                    <p>
                                      {properties?.find(p => p.id === selectedRequest.propertyId)?.name}
                                      {selectedRequest.unitId && ` - Unit ${selectedRequest.unitId}`}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <Label>Progress Notes</Label>
                                <div className="space-y-2">
                                  {selectedRequest.progressNotes?.map((note, i) => (
                                    <div key={i} className="p-2 bg-muted rounded">
                                      {note}
                                    </div>
                                  ))}
                                  <div className="flex gap-2">
                                    <Input
                                      value={newNote}
                                      onChange={(e) => setNewNote(e.target.value)}
                                      placeholder="Add a note..."
                                    />
                                    <Button onClick={() => addNote.mutate(newNote)}>
                                      Add Note
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <Label>Photos</Label>
                                <div className="grid grid-cols-3 gap-2">
                                  {selectedRequest.photos?.map((photo, i) => (
                                    <img 
                                      key={i}
                                      src={photo}
                                      alt={`Maintenance photo ${i + 1}`}
                                      className="rounded"
                                    />
                                  ))}
                                </div>
                                <div className="mt-2">
                                  <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setNewPhoto(e.target.files?.[0] || null)}
                                  />
                                  <Button
                                    className="mt-2"
                                    disabled={!newPhoto}
                                    onClick={() => newPhoto && addPhoto.mutate(newPhoto)}
                                  >
                                    Upload Photo
                                  </Button>
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                {isEditing ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      onClick={() => setIsEditing(false)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => updateRequest.mutate(selectedRequest)}
                                    >
                                      Save Changes
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    onClick={() => setIsEditing(true)}
                                  >
                                    Edit Request
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
