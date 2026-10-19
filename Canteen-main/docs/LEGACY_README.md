# 🍽️ The Grand Kitchen - Modern Canteen Management System

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green)

**A complete web-based canteen management system with customer ordering, admin dashboard, cart functionality, and order management.**

[Features](#-features) • [Demo Credentials](#-demo-credentials) • [Installation](#-installation) • [Screenshots](#-screenshots) • [API Reference](#-api-reference)

</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Color Scheme](#-color-scheme)
- [Font System](#-font-system)
- [File Structure](#-file-structure)
- [Features](#-features)
- [Demo Credentials](#-demo-credentials)
- [Installation](#-installation)
- [Usage Guide](#-usage-guide)
- [API Reference](#-api-reference)
- [LocalStorage Structure](#-localstorage-structure)
- [Responsive Breakpoints](#-responsive-breakpoints)
- [Browser Support](#-browser-support)
- [Troubleshooting](#-troubleshooting)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---

## 📖 Project Overview

**The Grand Kitchen** is a full-featured restaurant/canteen management web application that allows customers to browse menu items, add to cart, place orders, and manage their profile. The admin panel provides complete control over menu items, order processing, and revenue analytics.

### 🎯 Key Highlights

- ✅ **Zero Dependencies** - Pure HTML/CSS/JavaScript, no frameworks
- ✅ **Local Storage** - All data persists in browser (no backend required)
- ✅ **Mobile First** - Fully responsive across all devices
- ✅ **Dark/Light Mode** - Theme toggle with smooth transitions
- ✅ **Real-time Updates** - Instant cart and order updates

---

## 🎨 Color Scheme

The project uses a modern **Blue/Teal** color palette:

| CSS Variable | Color Value | Usage |
|--------------|-------------|-------|
| `--brand` | `#2563EB` | Primary buttons, links, active states |
| `--brand-dark` | `#1D4ED8` | Hover states |
| `--brand-light` | `rgba(37,99,235,0.10)` | Background highlights |
| `--brand-glow` | `rgba(37,99,235,0.28)` | Shadow effects |
| `--gradient` | `linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)` | Gradient backgrounds |
| `--heading-gradient` | `linear-gradient(135deg, #1E3A5F 0%, #2563EB 50%, #06B6D4 100%)` | Heading text gradients |
| `--shadow-brand` | `0 10px 32px rgba(37,99,235,.32)` | Brand shadows |

### Color Preview

Primary: ████████████████████ #2563EB
Dark: ████████████████████ #1D4ED8
Teal: ████████████████████ #06B6D4
Gradient: ████████████████████ #2563EB → #06B6D4

text

---

## 🔤 Font System

| Font Type | Font Stack | Usage |
|-----------|------------|-------|
| **Body** | `'Poppins', 'DM Sans', sans-serif` | All body text, buttons, inputs |
| **Heading** | `'Poppins', 'Syne', sans-serif` | Headings, titles, navigation |
| **Accent** | `'Tapestry', cursive` | Decorative elements (badges, eyebrows) |

### Font Classes

```css
/* Apply Tapestry cursive font to decorative elements */
.tapestry-regular {
  font-family: 'Tapestry', cursive;
  font-weight: 400;
  font-style: normal;
}
File Structure
text
modern-canteen/
│
├── 📄 home.html                 # Customer landing page with menu grid
├── 📄 item_details.html         # Individual item details with multi-angle images
├── 📄 cart.html                 # Shopping cart with promo codes & checkout
├── 📄 order-confirmation.html   # Order confirmation with invoice download
├── 📄 login.html                # Customer login page
├── 📄 signup.html               # Customer registration page
├── 📄 admin-login.html          # Admin portal login
├── 📄 admin.html                # Complete admin dashboard
├── 📄 styles.css                # Global styles with Blue/Teal theme
│
├──  assets/                   # (Optional) Images and icons
│
└── 📄 README.md                 # Project documentation
🚀 Features

👤 Customer Features

Feature	Description
User Authentication	Login/Signup with localStorage persistence
Menu Browsing	Grid view of all food items with Unsplash images
Search & Filter	Search by name, filter by category (Starters/Mains/Drinks/Desserts)
Veg/Non-Veg Filter	Toggle to show only vegetarian items
Price Sorting	Sort by price (Low to High / High to Low)
Item Details	Multi-angle images, pack sizes, add-ons, nutrition info
Cart Management	Add/remove items, update quantities in real-time
Promo Codes	Apply discounts (CANTEEN10, SAVE20, WELCOME)
Order Placement	Cash on pickup payment method
Order Tracking	Real-time order status with countdown timer
Ratings & Reviews	Rate items and leave feedback with star ratings
Wishlist	Save favorite items for later
Theme Toggle	Dark/Light mode switching with smooth animations
Mobile Responsive	Fully optimized for all devices

👨‍💼 Admin Features

Feature	Description
Dashboard	Real-time stats (total orders, pending, preparing, revenue)
Order Management	View, search, filter by status, update order status
Pagination	Orders paginated with 5 items per page
Menu Management	Add, edit, delete, and toggle availability of menu items
Revenue Analytics	Track earnings, paid orders, and top-selling items
Progress Bars	Visual representation of top-selling items
Settings	Restaurant information management
Theme Toggle	Dark/Light mode for admin panel
Mobile Sidebar	Collapsible sidebar with hamburger menu

🔐 Demo Credentials
Customer Login
Role	Email	Password
Demo User	student@example.com	1234
Or

Sign Up	Create your own account	

Admin Login
Username:	Password
admin:	1234

Promo Codes
Code	Discount
CANTEEN10	10% off
SAVE20	₹20 off
WELCOME	₹15 off
🔧 Installation
Local Setup
bash
# 1. Clone or download all files to a folder
git clone https://github.com/yourusername/modern-canteen.git

# 2. Navigate to project directory
cd modern-canteen

# 3. No build process required - open in browser
open home.html

# Or use VS Code Live Server
# Right-click home.html → Open with Live Server

Requirements

Any modern web browser (Chrome, Firefox, Safari, Edge)

Internet connection (for Google Fonts & Unsplash images)

LocalStorage enabled (default in all browsers)

📝 Usage Guide

👤 Customer Flow

1. Open home.html
   ↓
2. Browse menu / Search / Filter
   ↓
3. Click "+ Add" to add items to cart
   ↓
4. Click cart icon to view cart
   ↓
5. Apply promo code (optional)
   ↓
6. Click "Pay with Cash"
   ↓
7. Confirm order
   ↓
8. View order confirmation


👨‍💼 Admin Flow

1. Navigate to admin-login.html
   ↓
2. Login (admin / 1234)
   ↓
3. View Dashboard for stats
   ↓
4. Manage Orders (update status)
   ↓
5. Manage Menu (add/edit/delete items)
   ↓
6. View Revenue Analytics
