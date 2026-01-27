"""
OLYMPUS CHEF - E-commerce Components
=====================================
Light Theme + Glassmorphism Design
"""

import os

# Output directories
ECOMMERCE_DIR = r"C:\Users\SBS\Desktop\New folder (4)\vito\src\components\ecommerce"
PAGES_DIR = r"C:\Users\SBS\Desktop\New folder (4)\vito\src\app"

os.makedirs(ECOMMERCE_DIR, exist_ok=True)

# ============================================
# PRODUCT CARD
# ============================================
PRODUCT_CARD = '''\'use client\';

import Image from 'next/image';
import Link from 'next/link';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
  rating?: number;
}

export function ProductCard({ id, name, price, image, category, rating = 4.5 }: ProductCardProps) {
  return (
    <Link href={`/products/${id}`} className="group">
      <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
        {/* Image */}
        <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            {image || '📦'}
          </div>
          {/* Quick Actions */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="w-10 h-10 bg-white/80 backdrop-blur-xl rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="p-4">
          {category && (
            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
              {category}
            </span>
          )}
          <h3 className="font-semibold text-slate-900 mt-1 group-hover:text-indigo-600 transition-colors">
            {name}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ${price.toFixed(2)}
            </span>
            {/* Rating */}
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="text-sm text-slate-600">{rating}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
'''

# ============================================
# PRODUCT GRID
# ============================================
PRODUCT_GRID = '''\'use client\';

import { ProductCard } from './ProductCard';

const SAMPLE_PRODUCTS = [
  { id: '1', name: 'Premium Headphones', price: 299.99, image: '🎧', category: 'Electronics', rating: 4.8 },
  { id: '2', name: 'Smart Watch Pro', price: 449.99, image: '⌚', category: 'Electronics', rating: 4.6 },
  { id: '3', name: 'Wireless Keyboard', price: 129.99, image: '⌨️', category: 'Accessories', rating: 4.4 },
  { id: '4', name: 'Designer Backpack', price: 189.99, image: '🎒', category: 'Fashion', rating: 4.7 },
  { id: '5', name: 'Running Shoes', price: 159.99, image: '👟', category: 'Sports', rating: 4.5 },
  { id: '6', name: 'Portable Speaker', price: 79.99, image: '🔊', category: 'Electronics', rating: 4.3 },
  { id: '7', name: 'Sunglasses', price: 199.99, image: '🕶️', category: 'Fashion', rating: 4.9 },
  { id: '8', name: 'Coffee Maker', price: 249.99, image: '☕', category: 'Home', rating: 4.6 },
];

export function ProductGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {SAMPLE_PRODUCTS.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
}
'''

# ============================================
# CART
# ============================================
CART = '''\'use client\';

import { useState } from 'react';
import Link from 'next/link';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

const SAMPLE_CART: CartItem[] = [
  { id: '1', name: 'Premium Headphones', price: 299.99, quantity: 1, image: '🎧' },
  { id: '2', name: 'Smart Watch Pro', price: 449.99, quantity: 2, image: '⌚' },
];

export function Cart() {
  const [items, setItems] = useState<CartItem[]>(SAMPLE_CART);

  const updateQuantity = (id: string, delta: number) => {
    setItems(items.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 9.99;
  const total = subtotal + shipping;

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl overflow-hidden">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Shopping Cart</h2>
        <p className="text-slate-500 text-sm">{items.length} items</p>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.id} className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-3xl">
              {item.image}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">{item.name}</h3>
              <p className="text-indigo-600 font-semibold">${item.price.toFixed(2)}</p>
            </div>
            {/* Quantity */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, -1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                -
              </button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, 1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="p-6 bg-slate-50/50 space-y-3">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t border-slate-200">
          <span>Total</span>
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ${total.toFixed(2)}
          </span>
        </div>
        <Link
          href="/checkout"
          className="block w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-center rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all mt-4"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
'''

# ============================================
# CHECKOUT FORM
# ============================================
CHECKOUT = '''\'use client\';

import { useState } from 'react';

export function CheckoutForm() {
  const [step, setStep] = useState(1);

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl overflow-hidden">
      {/* Progress */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          {['Shipping', 'Payment', 'Review'].map((label, i) => (
            <div key={label} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                step > i + 1
                  ? 'bg-green-500 text-white'
                  : step === i + 1
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`ml-2 font-medium ${step === i + 1 ? 'text-indigo-600' : 'text-slate-500'}`}>
                {label}
              </span>
              {i < 2 && <div className="w-12 h-0.5 bg-slate-200 mx-4" />}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Shipping Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Last Name"
                className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <input
              type="text"
              placeholder="Address"
              className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="City"
                className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="State"
                className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="ZIP"
                className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Method</h3>
            <input
              type="text"
              placeholder="Card Number"
              className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="MM/YY"
                className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="CVC"
                className="px-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Review Your Order</h3>
            <p className="text-slate-500">Everything looks good! Ready to place your order.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => step < 3 ? setStep(step + 1) : alert('Order placed!')}
            className="ml-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 transition-all"
          >
            {step === 3 ? 'Place Order' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
'''

# ============================================
# E-COMMERCE INDEX
# ============================================
INDEX = '''// OLYMPUS E-commerce Components
export { ProductCard } from './ProductCard';
export { ProductGrid } from './ProductGrid';
export { Cart } from './Cart';
export { CheckoutForm } from './CheckoutForm';
'''

# ============================================
# SHOP PAGE
# ============================================
SHOP_PAGE = '''\'use client\';

import { Header, Footer } from '@/components/marketing';
import { ProductGrid } from '@/components/ecommerce';

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Shop Our{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Collection
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Discover premium products curated just for you.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl">
            <div className="flex gap-2">
              {['All', 'Electronics', 'Fashion', 'Home', 'Sports'].map((cat) => (
                <button
                  key={cat}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
            <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Sort by: Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest</option>
            </select>
          </div>

          {/* Products */}
          <ProductGrid />
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# CART PAGE
# ============================================
CART_PAGE = '''\'use client\';

import { Header, Footer } from '@/components/marketing';
import { Cart } from '@/components/ecommerce';

export default function CartPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Your Cart</h1>
          <Cart />
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# CHECKOUT PAGE
# ============================================
CHECKOUT_PAGE = '''\'use client\';

import { Header, Footer } from '@/components/marketing';
import { CheckoutForm } from '@/components/ecommerce';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>
          <CheckoutForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
'''

# ============================================
# SAVE ALL
# ============================================
def save_all():
    print("=" * 50)
    print("OLYMPUS CHEF - E-commerce Components")
    print("=" * 50)

    # Components
    components = {
        'ProductCard.tsx': PRODUCT_CARD,
        'ProductGrid.tsx': PRODUCT_GRID,
        'Cart.tsx': CART,
        'CheckoutForm.tsx': CHECKOUT,
        'index.ts': INDEX,
    }

    for filename, code in components.items():
        filepath = os.path.join(ECOMMERCE_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"[OK] {ECOMMERCE_DIR}\\{filename}")

    # Pages
    pages = [
        ('shop', SHOP_PAGE),
        ('cart', CART_PAGE),
        ('checkout', CHECKOUT_PAGE),
    ]

    for page_name, code in pages:
        page_dir = os.path.join(PAGES_DIR, page_name)
        os.makedirs(page_dir, exist_ok=True)
        filepath = os.path.join(page_dir, 'page.tsx')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
        print(f"[OK] {page_dir}\\page.tsx")

    print("\n" + "=" * 50)
    print("E-commerce components generated!")
    print("=" * 50)

if __name__ == '__main__':
    save_all()
