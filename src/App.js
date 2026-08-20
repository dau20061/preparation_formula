import React, { useState, useEffect } from 'react';
import './App.css';
import logoImg from './logo.png';

// Link Firebase Realtime Database
const FIREBASE_BASE_URL = "https://preparation-formula-default-rtdb.asia-southeast1.firebasedatabase.app";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  
  // TỰ ĐỘNG BẬT CHẾ ĐỘ DARK MODE MẶC ĐỊNH
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  // Form Đăng nhập / Đăng ký
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Data
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState(['Tất cả']);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [videoModalUrl, setVideoModalUrl] = useState(null);

  // Lưu và áp dụng theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      const res = await fetch(`${FIREBASE_BASE_URL}/recipes.json`);
      const data = await res.json();
      
      let allRecipes = [];
      if (data) {
        allRecipes = Object.keys(data).map(k => ({ id: k, ...data[k] }));
      }

      // LỌC CHỈ LẤY NHỮNG MÓN ĐƯỢC ADMIN CẤP PHÉP TRÊN ỨNG DỤNG PYTHON
      const allowedList = currentUser.allowedRecipes || [];
      const userAccessibleRecipes = allRecipes.filter(r => allowedList.includes(r.id));
      
      setRecipes(userAccessibleRecipes);
      if (userAccessibleRecipes.length > 0) {
        setSelectedRecipe(userAccessibleRecipes[0]);
      } else {
        setSelectedRecipe(null);
      }

      const cats = ['Tất cả', ...new Set(userAccessibleRecipes.map(r => r.category || 'Chung'))];
      setCategories(cats);
    } catch (err) {
      alert("Lỗi tải dữ liệu: " + err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return alert("Vui lòng nhập đầy đủ thông tin!");

    try {
      const res = await fetch(`${FIREBASE_BASE_URL}/users.json`);
      const usersData = await res.json();
      
      if (!usersData) return alert("Tài khoản không tồn tại!");

      const foundKey = Object.keys(usersData).find(
        k => usersData[k].username === username && usersData[k].password === password
      );

      if (!foundKey) {
        return alert("Sai tên đăng nhập hoặc mật khẩu!");
      }

      const user = { id: foundKey, ...usersData[foundKey] };
      if (user.status === "pending") {
        return alert("Tài khoản đang chờ Admin trên Python phê duyệt!");
      }

      setCurrentUser(user);
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password || !fullName) return alert("Vui lòng nhập đầy đủ!");

    try {
      const res = await fetch(`${FIREBASE_BASE_URL}/users.json`);
      const usersData = await res.json();

      if (usersData) {
        const exist = Object.values(usersData).some(u => u.username === username);
        if (exist) return alert("Tên đăng nhập này đã được sử dụng!");
      }

      const newUser = {
        username,
        password,
        fullName,
        status: "approved",
        allowedRecipes: [], // Mặc định 0 món, chờ admin phân quyền
        createdAt: Date.now()
      };

      await fetch(`${FIREBASE_BASE_URL}/users.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });

      alert("Đăng ký thành công! Vui lòng liên hệ Admin Python để được cấp quyền mở các món công thức.");
      setIsRegister(false);
    } catch (err) {
      alert("Lỗi đăng ký: " + err.message);
    }
  };

  // MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ
  if (!currentUser) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src={logoImg} alt="Casa Tea & Food" style={{ height: 60, objectFit: 'contain' }} />
          </div>
          <h2>Culinary Handbook</h2>
          <p>{isRegister ? "Đăng ký tài khoản để xem công thức pha chế" : "Đăng nhập vào sổ tay công thức của bạn"}</p>

          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            {isRegister && (
              <div className="form-group">
                <label>Họ và Tên</label>
                <input
                  type="text"
                  placeholder="VD: Võ Quốc Đầu"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>Tên đăng nhập</label>
              <input
                type="text"
                placeholder="Nhập username..."
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary">
              {isRegister ? "Tạo Tài Khoản" : "Đăng Nhập"}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister ? (
              <>Đã có tài khoản? <span onClick={() => setIsRegister(false)}>Đăng nhập ngay</span></>
            ) : (
              <>Chưa có tài khoản? <span onClick={() => setIsRegister(true)}>Đăng ký tài khoản</span></>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredRecipes = recipes.filter(r => {
    const matchQuery = (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (r.teaCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'Tất cả' || r.category === selectedCategory;
    return matchQuery && matchCat;
  });

  return (
    <div>
      {/* NAVBAR */}
      <div className="navbar">
        {/* LOGO CASA TEA & FOOD */}
        <div className="nav-brand">
          <img src={logoImg} alt="Casa Tea & Food" className="brand-logo-img" />
          <span className="brand-text">Sổ Tay Casa</span>
        </div>

        <div className="header-actions">
          {/* NÚT CHUYỂN ĐỔI CHẾ ĐỘ SÁNG / TỐI */}
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Chế độ sáng' : '🌙 Chế độ tối'}
          </button>

          <div className="user-badge">
            <div className="user-name">{currentUser.fullName || currentUser.username}</div>
            <div className="user-role">Được cấp quyền: {recipes.length} món</div>
          </div>

          <button className="btn-logout" onClick={() => setCurrentUser(null)}>
            Đăng xuất
          </button>
        </div>
      </div>

      {/* GIAO DIỆN 2 CỘT */}
      <div className="main-wrapper">
        {/* ================= CỘT TRÁI ================= */}
        <div className="left-column">
          <div className="search-input-box">
            <span>🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Tìm kiếm món pha chế..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-bar">
            {categories.map(cat => (
              <button
                key={cat}
                className={`chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredRecipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--text-muted)' }}>
              <h4>Chưa có công thức nào được cấp quyền</h4>
              <p style={{ marginTop: 6, fontSize: 13 }}>Hãy báo Admin trên App Python cấp quyền cho tài khoản của bạn.</p>
            </div>
          ) : (
            <div className="recipe-list">
              {filteredRecipes.map(r => {
                const isSelected = selectedRecipe?.id === r.id;
                return (
                  <div
                    key={r.id}
                    className={`recipe-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedRecipe(r)}
                  >
                    <div className="thumb-box">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl.startsWith('data:') ? r.imageUrl : `data:image/jpeg;base64,${r.imageUrl}`}
                          alt={r.title}
                        />
                      ) : (
                        <span>🫖</span>
                      )}
                    </div>
                    <div className="recipe-meta">
                      <h4>{r.title}</h4>
                      <span className="tag-cat">{r.category || 'Chung'}</span>
                      <div className="meta-row">
                        <span>#ID: {r.teaCode || 'N/A'}</span> • <span>⏱ {r.cookingTime || 0} phút</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= CỘT PHẢI ================= */}
        <div className="right-column">
          {selectedRecipe ? (
            <div className="detail-container">
              {/* KHUNG CĂN GIỮA FULL HÌNH ẢNH LY TRÀ SỮA (OBJECT-FIT: CONTAIN) */}
              {selectedRecipe.imageUrl && (
                <div className="detail-hero-wrapper">
                  <img
                    className="detail-hero-img"
                    src={selectedRecipe.imageUrl.startsWith('data:') ? selectedRecipe.imageUrl : `data:image/jpeg;base64,${selectedRecipe.imageUrl}`}
                    alt={selectedRecipe.title}
                  />
                </div>
              )}

              {/* Tiêu đề & Metadata */}
              <div className="detail-header">
                <h1 className="detail-title">{selectedRecipe.title}</h1>
                <div className="detail-meta-info">
                  <span>📁 {selectedRecipe.category || 'Chung'}</span>
                  <span>•</span>
                  <span>#{selectedRecipe.teaCode || 'N/A'}</span>
                  <span>•</span>
                  <span>⏱ {selectedRecipe.cookingTime || 0} phút</span>
                </div>
              </div>

              {/* Nút Xem Video Clip */}
              {selectedRecipe.videoUrl && (
                <button
                  className="btn-watch-video"
                  onClick={() => setVideoModalUrl(
                    selectedRecipe.videoUrl.startsWith('data:')
                      ? selectedRecipe.videoUrl
                      : `data:video/mp4;base64,${selectedRecipe.videoUrl}`
                  )}
                >
                  <span>▶</span>
                  <span>Xem Video Clip Hướng Dẫn</span>
                </button>
              )}

              {/* 2 KHUNG THÔNG TIN SONG SONG */}
              <div className="cards-row">
                <div className="info-card">
                  <h4>
                    <span>📋</span>
                    <span>Nguyên Liệu Chuẩn Bị</span>
                  </h4>
                  {(selectedRecipe.ingredients || []).map((ing, i) => (
                    <div key={i} className="ing-item">
                      <span className="check-icon">✓</span>
                      <span>{ing}</span>
                    </div>
                  ))}
                  {(!selectedRecipe.ingredients || selectedRecipe.ingredients.length === 0) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có nguyên liệu</div>
                  )}
                </div>

                <div className="info-card">
                  <h4>
                    <span>🫖</span>
                    <span>Hướng Dẫn Thực Hiện</span>
                  </h4>
                  {(selectedRecipe.instructions || '').split('\n').filter(s => s.trim()).map((step, idx) => (
                    <div key={idx} className="step-item">
                      <div className="step-number">{idx + 1}</div>
                      <div className="step-content">{step}</div>
                    </div>
                  ))}
                  {(!selectedRecipe.instructions) && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có hướng dẫn</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '120px 20px', color: 'var(--text-muted)' }}>
              <h3>Chọn một món bên danh sách để xem chi tiết công thức</h3>
            </div>
          )}
        </div>
      </div>

      {/* MODAL PHÁT VIDEO */}
      {videoModalUrl && (
        <div className="video-modal-overlay">
          <div className="video-modal-content">
            <button className="video-close-btn" onClick={() => setVideoModalUrl(null)}>
              ✕ Đóng
            </button>
            <video controls autoPlay style={{ width: '100%', maxHeight: '72vh', borderRadius: 12 }}>
              <source src={videoModalUrl} type="video/mp4" />
              Trình duyệt không hỗ trợ phát video.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}