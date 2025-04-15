
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash } from 'lucide-react';

export default function PropertiesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  const form = useForm({
    defaultValues: {
      name: '',
      unit: '',
      rentAmount: '',
      securityDepositAmount: '',
      status: 'available'
    }
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ['/api/properties'],
  });

  const addProperty = useMutation({
    mutationFn: async (data) => {
      return await apiRequest('/api/properties', {
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/properties']);
      toast({ title: 'Success', description: 'Property added successfully' });
      setDialogMode(null);
    }
  });

  const editProperty = useMutation({
    mutationFn: async (data) => {
      return await apiRequest(`/api/properties/${data.id}`, {
        method: 'PUT',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/properties']);
      toast({ title: 'Success', description: 'Property updated successfully' });
      setDialogMode(null);
    }
  });

  const deleteProperty = useMutation({
    mutationFn: async (id) => {
      return await apiRequest(`/api/properties/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/properties']);
      toast({ title: 'Success', description: 'Property deleted successfully' });
    }
  });

  const handleSubmit = (data) => {
    if (dialogMode === 'add') {
      addProperty.mutate(data);
    } else {
      editProperty.mutate({ ...data, id: selectedProperty.id });
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Properties</h1>
            <p className="text-muted-foreground">Manage your properties</p>
          </div>
          <Button onClick={() => setDialogMode('add')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>

        <div className="grid gap-6">
          {properties?.map((property) => (
            <Card key={property.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{property.name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedProperty(property);
                      setDialogMode('edit');
                      form.reset(property);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteProperty.mutate(property.id)}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Unit:</span> {property.unit}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {property.status}
                  </div>
                  <div>
                    <span className="font-medium">Rent:</span> ${property.rentAmount}
                  </div>
                  <div>
                    <span className="font-medium">Security Deposit:</span> ${property.securityDepositAmount}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={!!dialogMode} onOpenChange={() => setDialogMode(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialogMode === 'add' ? 'Add Property' : 'Edit Property'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rent Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="securityDepositAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit Amount</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit">
                  {dialogMode === 'add' ? 'Add Property' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
