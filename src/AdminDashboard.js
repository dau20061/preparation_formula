import React, { useState, useEffect, useCallback } from 'react';
import './AdminDashboard.css';

const FIREBASE_BASE_URL = "https://preparation-formula-default-rtdb.asia-southeast1.firebasedatabase.app";

export default function AdminDashboard({ onLogout, toggleTheme, theme }) {
  const [activeTab, setActiveTab] = useState('recipes'); // 'recipes' | 'users'
  const [recipes, setRecipes] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  // State Modal Công thức
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [title, setTitle] = useState('');
  const [teaCode, setTeaCode] = useState('');
  const [category, setCategory] = useState('');
  const [cookingTime, setCookingTime] = useState(0);
  const [ingredients, setIngredients] = useState(['']);
  const [instructions, setInstructions] = useState(['']);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // State Modal User & Phân quyền
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [uFullName, setUFullName] = useState('');
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');

  const [showPermModal, setShowPermModal] = useState(false);
  const [permUser, setPermUser] = useState(null);
  const [selectedAllowedIds, setSelectedAllowedIds] = useState([]);

  // Tải dữ liệu tổng từ Firebase
  const loadAllData = useCallback(async () => {
    try {
      const [recRes, userRes, catRes] = await Promise.all([
        fetch(`${FIREBASE_BASE_URL}/recipes.json`),
        fetch(`${FIREBASE_BASE_URL}/users.json`),
        fetch(`${FIREBASE_BASE_URL}/categories.json`)
      ]);

      const recData = await recRes.json();
      const userData = await userRes.json();
      const catData = await catRes.json();

      setRecipes(recData ? Object.keys(recData).map(k => ({ id: k, ...recData[k] })).reverse() : []);
      setUsers(userData ? Object.keys(userData).map(k => ({ id: k, ...userData[k] })) : []);
      setCategories(catData ? Object.values(catData).map(c => c.name) : ['Menu Triển Lãm VietFood 2026', 'Trà Sữa', 'Trà Trái Cây']);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ================= RECIPES CRUD =================
  const handleOpenAddRecipe = () => {
    setEditingRecipe(null);
    setTitle('');
    setTeaCode('');
    setCategory(categories[0] || 'Chung');
    setCookingTime(10);
    setIngredients(['']);
    setInstructions(['']);
    setImageUrl('');
    setVideoUrl('');
    setShowRecipeModal(true);
  };

  const handleOpenEditRecipe = (r) => {
    setEditingRecipe(r);
    setTitle(r.title || '');
    setTeaCode(r.teaCode || '');
    setCategory(r.category || 'Chung');
    setCookingTime(r.cookingTime || 0);
    setIngredients(r.ingredients && r.ingredients.length > 0 ? r.ingredients : ['']);
    setInstructions(r.instructions ? r.instructions.split('\n') : ['']);
    setImageUrl(r.imageUrl || '');
    setVideoUrl(r.videoUrl || '');
    setShowRecipeModal(true);
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Vui lòng nhập tên công thức!");

    const payload = {
      title: title.trim(),
      teaCode: teaCode.trim(),
      category: category || 'Chung',
      cookingTime: Number(cookingTime) || 0,
      ingredients: ingredients.filter(i => i.trim()),
      instructions: instructions.filter(i => i.trim()).join('\n'),
      imageUrl,
      videoUrl,
      createdAt: editingRecipe ? (editingRecipe.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    try {
      if (editingRecipe) {
        await fetch(`${FIREBASE_BASE_URL}/recipes/${editingRecipe.id}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`${FIREBASE_BASE_URL}/recipes.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setShowRecipeModal(false);
      loadAllData();
      alert("Lưu công thức thành công!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleDeleteRecipe = async (id, name) => {
    if (!window.confirm(`Xóa vĩnh viễn món "${name}"?`)) return;
    try {
      await fetch(`${FIREBASE_BASE_URL}/recipes/${id}.json`, { method: 'DELETE' });
      loadAllData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'image') setImageUrl(reader.result);
      if (type === 'video') setVideoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // ================= USERS CRUD =================
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUFullName('');
    setUUsername('');
    setUPassword('');
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUFullName(u.fullName || '');
    setUUsername(u.username || '');
    setUPassword(u.password || '');
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!uUsername.trim() || !uPassword.trim()) return alert("Vui lòng nhập username và password!");

    const payload = {
      fullName: uFullName.trim() || uUsername.trim(),
      username: uUsername.trim(),
      password: uPassword.trim(),
      status: 'approved',
      updatedAt: Date.now()
    };

    try {
      if (editingUser) {
        await fetch(`${FIREBASE_BASE_URL}/users/${editingUser.id}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        payload.allowedRecipes = [];
        payload.createdAt = Date.now();
        await fetch(`${FIREBASE_BASE_URL}/users.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setShowUserModal(false);
      loadAllData();
      alert("Lưu thông tin tài khoản thành công!");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Xóa tài khoản @${u.username}?`)) return;
    try {
      await fetch(`${FIREBASE_BASE_URL}/users/${u.id}.json`, { method: 'DELETE' });
      loadAllData();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  // Phân quyền
  const handleOpenPerm = (u) => {
    setPermUser(u);
    setSelectedAllowedIds(u.allowedRecipes || []);
    setShowPermModal(true);
  };

  const handleTogglePermRecipe = (id) => {
    setSelectedAllowedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSavePermissions = async () => {
    if (!permUser) return;
    try {
      await fetch(`${FIREBASE_BASE_URL}/users/${permUser.id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedRecipes: selectedAllowedIds })
      });
      setShowPermModal(false);
      loadAllData();
      alert(`Đã cấp quyền xem ${selectedAllowedIds.length} món cho @${permUser.username}!`);
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-logo-box">
            <span className="brand-logo-title">Casa</span>
            <span className="brand-logo-sub">ADMIN PORTAL</span>
          </div>
          <span className="brand-text">Hệ Thống Quản Trị Viên</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Sáng' : '🌙 Tối'}
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, color: 'var(--primary-green)' }}>Admin Master</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Toàn quyền hệ thống</div>
          </div>
          <button className="btn-logout" onClick={onLogout}>Đăng xuất</button>
        </div>
      </header>

      <div className="admin-nav-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          🍹 Quản Lý Món Ăn ({recipes.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Người Dùng & Phân Quyền ({users.length})
        </button>
      </div>

      <main className="admin-main-body">
        {activeTab === 'recipes' && (
          <div className="admin-card-box">
            <div className="admin-top-action">
              <h2>Danh Sách Công Thức Pha Chế</h2>
              <button className="admin-btn-add" onClick={handleOpenAddRecipe}>
                ➕ Thêm Công Thức Mới
              </button>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Mã món</th>
                  <th>Tên món</th>
                  <th>Danh mục</th>
                  <th>Thời gian</th>
                  <th>Video clip</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="thumb-box" style={{ width: 44, height: 44 }}>
                        {r.imageUrl ? <img src={r.imageUrl} alt="" /> : '🫖'}
                      </div>
                    </td>
                    <td><b>{r.teaCode || '-'}</b></td>
                    <td><b>{r.title}</b></td>
                    <td><span className="tag-cat">{r.category}</span></td>
                    <td>⏱ {r.cookingTime}p</td>
                    <td>{r.videoUrl ? '🎬 Có Clip' : '—'}</td>
                    <td>
                      <button className="admin-btn-action btn-edit" onClick={() => handleOpenEditRecipe(r)}>Sửa</button>
                      <button className="admin-btn-action btn-del" onClick={() => handleDeleteRecipe(r.id, r.title)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-card-box">
            <div className="admin-top-action">
              <h2>Danh Sách Tài Khoản Khách Hàng / Nhân Viên</h2>
              <button className="admin-btn-add" onClick={handleOpenAddUser}>
                ➕ Thêm Tài Khoản Mới
              </button>
            </div>

            <table className="admin-table">
              <thead>
                <tr>
                  <th>Họ và Tên</th>
                  <th>Username</th>
                  <th>Mật khẩu</th>
                  <th>Số món được xem</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><b>{u.fullName || u.username}</b></td>
                    <td>@{u.username}</td>
                    <td><code>{u.password}</code></td>
                    <td>
                      <span className="tag-cat">
                        {(u.allowedRecipes || []).length} / {recipes.length} món
                      </span>
                    </td>
                    <td>
                      <button className="admin-btn-action btn-perm" onClick={() => handleOpenPerm(u)}>🔑 Phân quyền</button>
                      <button className="admin-btn-action btn-edit" onClick={() => handleOpenEditUser(u)}>Sửa</button>
                      <button className="admin-btn-action btn-del" onClick={() => handleDeleteUser(u)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL CÔNG THỨC */}
      {showRecipeModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <h3 style={{ marginBottom: 16 }}>{editingRecipe ? '✏️ Chỉnh Sửa Công Thức' : '➕ Thêm Công Thức Mới'}</h3>
            <form onSubmit={handleSaveRecipe}>
              <div className="form-group">
                <label>Tên món (*)</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Lục Trà Chanh Dây" required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Mã món (Tea Code)</label>
                  <input type="text" value={teaCode} onChange={e => setTeaCode(e.target.value)} placeholder="VD: 9059-1" />
                </div>
                <div className="form-group">
                  <label>Thời gian (phút)</label>
                  <input type="number" value={cookingTime} onChange={e => setCookingTime(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Danh mục món</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border-color)', background: 'var(--search-bg)', color: 'var(--text-main)', padding: '0 12px' }}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ margin: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontWeight: 700, fontSize: 13 }}>Nguyên liệu chuẩn bị:</label>
                  <button type="button" onClick={() => setIngredients([...ingredients, ''])} style={{ cursor: 'pointer', fontWeight: 'bold' }}>+ Thêm dòng</button>
                </div>
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="dynamic-row">
                    <input type="text" value={ing} onChange={e => {
                      const copy = [...ingredients];
                      copy[idx] = e.target.value;
                      setIngredients(copy);
                    }} placeholder={`Nguyên liệu ${idx + 1}...`} />
                    {ingredients.length > 1 && (
                      <button type="button" className="btn-remove-row" onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ margin: '16px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontWeight: 700, fontSize: 13 }}>Các bước thực hiện:</label>
                  <button type="button" onClick={() => setInstructions([...instructions, ''])} style={{ cursor: 'pointer', fontWeight: 'bold' }}>+ Thêm bước</button>
                </div>
                {instructions.map((inst, idx) => (
                  <div key={idx} className="dynamic-row">
                    <input type="text" value={inst} onChange={e => {
                      const copy = [...instructions];
                      copy[idx] = e.target.value;
                      setInstructions(copy);
                    }} placeholder={`Bước ${idx + 1}...`} />
                    {instructions.length > 1 && (
                      <button type="button" className="btn-remove-row" onClick={() => setInstructions(instructions.filter((_, i) => i !== idx))}>✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '14px 0' }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Ảnh món:</label>
                  <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'image')} style={{ marginTop: 4, fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Clip Video:</label>
                  <input type="file" accept="video/*" onChange={e => handleFileChange(e, 'video')} style={{ marginTop: 4, fontSize: 12 }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn-logout" onClick={() => setShowRecipeModal(false)}>Hủy</button>
                <button type="submit" className="admin-btn-add">Lưu Công Thức</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL USER */}
      {showUserModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: 420 }}>
            <h3>{editingUser ? '✏️ Sửa Tài Khoản' : '➕ Thêm Tài Khoản'}</h3>
            <form onSubmit={handleSaveUser} style={{ marginTop: 16 }}>
              <div className="form-group">
                <label>Họ và Tên</label>
                <input type="text" value={uFullName} onChange={e => setUFullName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
              </div>
              <div className="form-group">
                <label>Tên đăng nhập (Username)</label>
                <input type="text" value={uUsername} onChange={e => setUUsername(e.target.value)} placeholder="VD: nhanvien1" required />
              </div>
              <div className="form-group">
                <label>Mật khẩu</label>
                <input type="text" value={uPassword} onChange={e => setUPassword(e.target.value)} placeholder="Mật khẩu..." required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn-logout" onClick={() => setShowUserModal(false)}>Hủy</button>
                <button type="submit" className="admin-btn-add">Lưu Tài Khoản</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PHÂN QUYỀN */}
      {showPermModal && permUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <h3>🔑 Phân Quyền Xem Món Cho: @{permUser.username}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
              Tích chọn các món bạn cho phép tài khoản này nhìn thấy trên Web:
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button type="button" onClick={() => setSelectedAllowedIds(recipes.map(r => r.id))} style={{ padding: '4px 10px', borderRadius: 8 }}>Chọn tất cả</button>
              <button type="button" onClick={() => setSelectedAllowedIds([])} style={{ padding: '4px 10px', borderRadius: 8 }}>Bỏ chọn hết</button>
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 12, padding: 12 }}>
              {recipes.map(r => {
                const isChecked = selectedAllowedIds.includes(r.id);
                return (
                  <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePermRecipe(r.id)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span><b>{r.title}</b> ({r.category} - #{r.teaCode})</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn-logout" onClick={() => setShowPermModal(false)}>Hủy</button>
              <button type="button" className="admin-btn-add" onClick={handleSavePermissions}>Lưu Phân Quyền</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}