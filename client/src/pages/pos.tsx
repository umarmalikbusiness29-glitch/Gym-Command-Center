import LayoutShell from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Plus, Minus, ShoppingCart, Package, Check, X, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

export default function POSPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<{ productId: number; quantity: number; name: string; price: number }[]>([]);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", category: "", price: "", stock: "" });
  const [selectedMember, setSelectedMember] = useState("");

  const isAdmin = user?.role === "admin";

  const { data: products, isLoading } = useQuery({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: members } = useQuery({
    queryKey: [api.members.list.path],
    queryFn: async () => {
      const res = await fetch(api.members.list.path);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: profile } = useQuery({
    queryKey: [api.profile.me.path],
    queryFn: async () => {
      const res = await fetch(api.profile.me.path);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: user?.role === 'member',
  });

  const { data: pendingOrders } = useQuery({
    queryKey: [api.orders.list.path, 'pending'],
    queryFn: async () => {
      const res = await fetch(`${api.orders.list.path}?status=pending`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: isAdmin,
  });

  const addProductMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.products.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct.name,
          category: newProduct.category,
          price: newProduct.price,
          stock: parseInt(newProduct.stock),
          active: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to add product");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Product Added", description: "New product has been added to the store" });
      setAddProductOpen(false);
      setNewProduct({ name: "", category: "", price: "", stock: "" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed to add product", description: err.message });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const memberId = isAdmin ? parseInt(selectedMember) : profile?.id;
      if (!memberId) throw new Error("Please select a member");
      
      const res = await fetch(api.products.purchase.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          items: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
        }),
      });
      if (!res.ok) throw new Error("Purchase failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      if (isAdmin) {
        toast({ title: "Purchase Complete", description: "Order has been processed" });
      } else {
        toast({ title: "Order Requested", description: "Your order has been sent to admin for approval" });
      }
      setCart([]);
      setSelectedMember("");
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Request failed", description: err.message });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const url = buildUrl(api.orders.approve.path, { id: orderId });
      const res = await fetch(url, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to approve order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path, 'pending'] });
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      toast({ title: "Order Approved", description: "Order has been completed" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed to approve", description: err.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const url = buildUrl(api.orders.reject.path, { id: orderId });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to reject order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path, 'pending'] });
      toast({ title: "Order Rejected", description: "Order has been cancelled" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Failed to reject", description: err.message });
    },
  });

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, name: product.name, price: Number(product.price) }]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        return newQty <= 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as typeof cart);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Store</h1>
            <p className="text-muted-foreground mt-1">Supplements, apparel, and accessories</p>
          </div>
          {isAdmin && (
            <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-product">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Product Name</Label>
                    <Input
                      data-testid="input-product-name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Whey Protein"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input
                      data-testid="input-product-category"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      placeholder="Supplements"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Price ($)</Label>
                      <Input
                        data-testid="input-product-price"
                        type="number"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        placeholder="49.99"
                      />
                    </div>
                    <div>
                      <Label>Stock</Label>
                      <Input
                        data-testid="input-product-stock"
                        type="number"
                        value={newProduct.stock}
                        onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    data-testid="button-submit-product"
                    onClick={() => addProductMutation.mutate()}
                    disabled={!newProduct.name || !newProduct.price || addProductMutation.isPending}
                  >
                    {addProductMutation.isPending ? "Adding..." : "Add Product"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {isLoading ? (
                <p className="text-muted-foreground">Loading products...</p>
              ) : products?.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No products available</p>
                </div>
              ) : (
                products?.map((product: any) => (
                  <Card key={product.id} className="border-none shadow-lg bg-card/50 overflow-hidden">
                    {product.image && (
                      <div className="h-32 bg-muted">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-lg font-bold text-primary">${product.price}</span>
                        <Badge variant="secondary">{product.stock} left</Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button 
                        data-testid={`button-add-cart-${product.id}`}
                        className="w-full" 
                        size="sm"
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Add to Cart
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </div>

          <Card className="border-none shadow-lg bg-card/50 h-fit sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Your cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between py-2 border-b border-border/50">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.productId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.productId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold text-primary">${cartTotal.toFixed(2)}</span>
                  </div>

                  {isAdmin && (
                    <div className="mt-4">
                      <Label>Member</Label>
                      <Select value={selectedMember} onValueChange={setSelectedMember}>
                        <SelectTrigger data-testid="select-purchase-member">
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members?.filter((m: any) => m.user?.role === "member").map((m: any) => (
                            <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button 
                    data-testid="button-checkout"
                    className="w-full mt-4" 
                    onClick={() => purchaseMutation.mutate()}
                    disabled={purchaseMutation.isPending || (isAdmin && !selectedMember)}
                  >
                    {purchaseMutation.isPending ? "Processing..." : isAdmin ? "Complete Purchase" : "Request Order"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {isAdmin && pendingOrders && pendingOrders.length > 0 && (
          <Card className="border-none shadow-lg bg-card/50 mt-8">
            <CardHeader className="flex flex-row items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle>Pending Order Requests</CardTitle>
              <Badge variant="secondary" className="ml-2">{pendingOrders.length}</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order: any) => {
                    const member = members?.find((m: any) => m.id === order.memberId);
                    const items = order.items as { productId: number; quantity: number }[];
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>{member?.fullName || `Member #${order.memberId}`}</TableCell>
                        <TableCell>
                          {items.map((item, i) => {
                            const prod = products?.find((p: any) => p.id === item.productId);
                            return <span key={i}>{prod?.name || `Product #${item.productId}`} x{item.quantity}{i < items.length - 1 ? ", " : ""}</span>;
                          })}
                        </TableCell>
                        <TableCell className="font-bold text-primary">${order.totalAmount}</TableCell>
                        <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            data-testid={`button-approve-order-${order.id}`}
                            size="sm"
                            onClick={() => approveMutation.mutate(order.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            data-testid={`button-reject-order-${order.id}`}
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate(order.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutShell>
  );
}
