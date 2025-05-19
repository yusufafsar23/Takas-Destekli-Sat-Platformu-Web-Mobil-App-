import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/Header';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import CategoryPage from './pages/CategoryPage';
import Messages from './pages/Messages';
import ProductDetail from './pages/ProductDetail';
import ProductList from './pages/ProductList';
import ProductForm from './pages/ProductForm';
import Dashboard from './pages/Dashboard';
import About from './pages/About';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';

// Protected Route bileşeni
const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  // Yükleme durumunda spinner göster
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: "80vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Yükleniyor...</span>
        </div>
      </div>
    );
  }
  
  // Kullanıcı yoksa login sayfasına yönlendir
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // Kullanıcı varsa korunan sayfayı göster
  return children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Header />
            <main className="app-main">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/categories/:categoryId" element={<CategoryPage />} />
                <Route path="/categories/:categoryId/:subcategoryId" element={<CategoryPage />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/about" element={<About />} />
                
                {/* Protected Routes */}
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/messages" 
                  element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/products/add" 
                  element={
                    <ProtectedRoute>
                      <ProductForm />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/products/edit/:id" 
                  element={
                    <ProtectedRoute>
                      <ProductForm />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Fallback for not found pages */}
                <Route path="*" element={
                  <div className="container py-5 text-center">
                    <h1>404 - Sayfa Bulunamadı</h1>
                    <p>Aradığınız sayfa bulunamadı.</p>
                  </div>
                } />
              </Routes>
            </main>
            <footer className="app-footer bg-dark text-white py-4 mt-5">
              <div className="container">
                <div className="row">
                  <div className="col-md-6">
                    <h5>Takas Platformu</h5>
                    <p>Hem sıfır hem de ikinci el ürünlerin alım satımının yapılabildiği, takas özelliği ile desteklenen e-ticaret platformu.</p>
                  </div>
                  <div className="col-md-3">
                    <h5>Linkler</h5>
                    <ul className="list-unstyled">
                      <li><a href="/" className="text-white">Ana Sayfa</a></li>
                      <li><a href="/products" className="text-white">Ürünler</a></li>
                      <li><a href="/dashboard" className="text-white">Hesabım</a></li>
                      <li><a href="/about" className="text-white">Hakkımızda</a></li>
                    </ul>
                  </div>
                  <div className="col-md-3">
                    <h5>İletişim</h5>
                    <ul className="list-unstyled">
                      <li>Email: info@takasplatformu.com</li>
                      <li>Telefon: +90 (212) 123 4567</li>
                      <li>Adres: İstanbul, Türkiye</li>
                    </ul>
                  </div>
                </div>
                <hr className="bg-light" />
                <div className="text-center">
                  <p className="mb-0">&copy; {new Date().getFullYear()} Takas Platformu. Tüm hakları saklıdır.</p>
                </div>
              </div>
            </footer>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App; 