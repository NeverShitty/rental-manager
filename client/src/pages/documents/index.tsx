import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DownloadCloud, 
  FileText, 
  FolderOpen, 
  Search, 
  Upload,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

interface DocumentFile {
  path: string;
  category: string;
  subcategory?: string;
  dateAdded: string;
  fileName: string;
}

interface DocumentsResponse {
  files: DocumentFile[];
  groupedFiles: Record<string, Record<string, DocumentFile[]>>;
  categories: string[];
}

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('legal');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Fetch documents data
  const { data, isLoading, isError, error, refetch } = useQuery<DocumentsResponse>({
    queryKey: ['/api/documents'],
    refetchOnWindowFocus: false,
  });

  // Filter files based on search term and category
  const filteredFiles = React.useMemo(() => {
    if (!data?.files) return [];
    
    return data.files.filter(file => {
      const matchesSearch = searchTerm === '' || 
        file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.subcategory && file.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [data?.files, searchTerm, selectedCategory]);

  // Handle file upload
  const handleUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('document', uploadFile);
    formData.append('category', uploadCategory);
    formData.append('analyze', uploadCategory === 'legal' ? 'true' : 'false');

    setIsUploading(true);

    try {
      await axios.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast({
        title: "Upload successful",
        description: "Document has been uploaded and organized",
      });
      
      // Refetch documents to update the list
      refetch();
      
      // Reset upload state
      setUploadFile(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle manual organization
  const handleOrganize = async () => {
    try {
      const response = await axios.get('/api/documents/organize');
      
      if (response.data.organizedDocs && response.data.organizedDocs.length > 0) {
        toast({
          title: "Organization complete",
          description: `Organized ${response.data.organizedDocs.length} documents`,
        });
      } else {
        toast({
          title: "Organization complete",
          description: "No new documents to organize",
        });
      }
      
      // Refetch documents to update the list
      refetch();
      
    } catch (error) {
      console.error('Organization error:', error);
      toast({
        title: "Organization failed",
        description: "There was an error organizing documents",
        variant: "destructive",
      });
    }
  };

  // Handle file download
  const handleDownload = async (filePath: string) => {
    try {
      const response = await axios.get(`/api/documents/download/${filePath}`, {
        responseType: 'blob',
      });
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filePath.split('/').pop() || 'document');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading your document",
        variant: "destructive",
      });
    }
  };

  // Function to get color for category badges
  const getCategoryColor = (category: string): "default" | "primary" | "secondary" | "destructive" | "outline" => {
    const categoryColors: Record<string, "default" | "primary" | "secondary" | "destructive" | "outline"> = {
      legal: "primary",
      court: "destructive",
      communications: "secondary",
      financial: "default",
      media: "outline",
      general: "outline",
    };
    
    return categoryColors[category] || "default";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p>Loading documents...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="w-[600px]">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Documents</CardTitle>
              <CardDescription>
                There was a problem loading the documents list
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Unknown error'}
              </p>
              <Button onClick={() => refetch()}>Retry</Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Management</h1>
            <p className="text-muted-foreground">
              View, upload, and organize documents for ARIAS V BIANCHI case
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button data-tour="document-upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                  <DialogDescription>
                    Select a file to upload and categorize for the ARIAS V BIANCHI case
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="file" className="text-right">
                      File
                    </Label>
                    <Input
                      id="file"
                      type="file"
                      className="col-span-3"
                      onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">
                      Category
                    </Label>
                    <select
                      id="category"
                      className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                    >
                      {data?.categories.map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleOrganize} data-tour="document-organize">
              <FolderOpen className="mr-2 h-4 w-4" />
              Organize Files
            </Button>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1" data-tour="document-search">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {data?.categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <Tabs defaultValue="list" className="mb-6" data-tour="document-tabs">
          <TabsList>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="category">Category View</TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>All Documents</CardTitle>
                <CardDescription>
                  {filteredFiles.length} documents found in the ARIAS V BIANCHI case
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>No documents found</p>
                    {searchTerm && (
                      <p className="text-sm mt-1">
                        Try adjusting your search or category filter
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <div className="grid grid-cols-12 gap-4 p-4 font-medium border-b text-sm">
                      <div className="col-span-4">Filename</div>
                      <div className="col-span-3">Category</div>
                      <div className="col-span-3">Date Added</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="divide-y">
                      {filteredFiles.map((file, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 p-4 text-sm items-center">
                          <div className="col-span-4 font-medium truncate">{file.fileName}</div>
                          <div className="col-span-3">
                            <Badge variant={getCategoryColor(file.category)}>
                              {file.category}
                              {file.subcategory && `/${file.subcategory}`}
                            </Badge>
                          </div>
                          <div className="col-span-3 flex items-center">
                            <Calendar className="mr-2 h-4 w-4" />
                            {file.dateAdded !== 'unknown' ? file.dateAdded : 'Unknown date'}
                          </div>
                          <div className="col-span-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(file.path)}
                            >
                              <DownloadCloud className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category View */}
          <TabsContent value="category">
            <Card>
              <CardHeader>
                <CardTitle>Documents by Category</CardTitle>
                <CardDescription>
                  {filteredFiles.length} documents organized by category and subcategory
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(data?.groupedFiles || {}).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>No organized documents found</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(data?.groupedFiles || {})
                      .filter(([category]) => 
                        selectedCategory === 'all' || category === selectedCategory
                      )
                      .map(([category, subcategories]) => (
                        <AccordionItem key={category} value={category}>
                          <AccordionTrigger className="px-4 hover:no-underline">
                            <div className="flex items-center">
                              <Badge variant={getCategoryColor(category)} className="mr-2">
                                {category}
                              </Badge>
                              <span>
                                {Object.values(subcategories).flat().length} documents
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-0">
                            {Object.entries(subcategories).map(([subcategory, files]) => (
                              <div key={subcategory} className="mb-4">
                                <h4 className="font-medium text-sm mb-2 px-4 text-muted-foreground">
                                  {subcategory.charAt(0).toUpperCase() + subcategory.slice(1)}
                                </h4>
                                <div className="border rounded-md">
                                  {files
                                    .filter(file => 
                                      searchTerm === '' || 
                                      file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((file, index) => (
                                      <div 
                                        key={index} 
                                        className="flex items-center justify-between p-3 text-sm border-b last:border-b-0"
                                      >
                                        <div className="flex-1 truncate">{file.fileName}</div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">
                                            {file.dateAdded !== 'unknown' ? file.dateAdded : 'Unknown date'}
                                          </span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownload(file.path)}
                                          >
                                            <DownloadCloud className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  {files.filter(file => 
                                    searchTerm === '' || 
                                    file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
                                  ).length === 0 && (
                                    <div className="p-3 text-sm text-center text-muted-foreground">
                                      No matching files in this subcategory
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}