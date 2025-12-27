import { create } from 'zustand';
import { BASE_API, LOGIN_GET_KEY } from '../config';

// --- Types ---
export interface User {
  id?: string;
  username: string;
  role: string;
  full_name?: string;
  is_active?: boolean;
}

export interface Category {
  id: string;
  category_name: string;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Device {
  id: string;
  category_id: string;
  model_name: string;
  factory_pricelist_eur?: number;
  length_meter?: number;
  weight_unit?: number;
  is_active?: boolean;
}

export interface Settings {
  id?: string;
  is_active?: boolean;
  discount_multiplier?: number;
  freight_rate_per_meter_eur?: number;
  customs_numerator?: number;
  customs_denominator?: number;
  warranty_rate?: number;
  commission_factor?: number;
  office_factor?: number;
  profit_factor?: number;
  rounding_mode?: string;
  rounding_step?: number;
  exchange_rate_irr_per_eur?: number;
  created_at?: string;
}

export interface Project {
  id: string;
  created_by_user_id: string;
  assigned_sales_manager_id?: string;
  assigned_sales_manager_name?: string;
  project_name: string;
  employer_name: string;
  project_type: string;
  address_text?: string;
  tehran_lat?: number;
  tehran_lng?: number;
  additional_info?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'draft';
  inquiry_status?: string;
  approval_decision_by?: string;
  approval_decision_at?: string;
  approval_note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectStatusHistory {
  id: string;
  project_id: string;
  changed_by_user_id: string;
  from_status: string;
  to_status: string;
  note?: string;
  created_at: string;
}

export interface ProjectComment {
  id: string;
  project_id: string;
  author_user_id: string;
  author_role_snapshot?: string;
  body: string;
  parent_comment_id?: string;
  created_at: string;
  author_name?: string;
}

export interface ProjectInquiry {
  id: string;
  project_id: string;
  requested_by_user_id: string;
  device_id: string;
  category_id: string;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected';
  title?: string;
  description?: string;
  unitPriceEUR?: number | null;
  totalPriceEUR?: number | null;
  currency?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  query_text_snapshot?: string;
  settings_id_snapshot?: string;
  created_at: string;
  model_name?: string;
  sell_price_eur_snapshot?: number | null;
  sell_price_irr_snapshot?: number | null;
  project_name?: string;
  employer_name?: string;
  requested_by_name?: string;
}

export interface InquiryPriceSnapshot {
  id: string;
  project_inquiry_id: string;
  sell_price_eur_snapshot: number;
  sell_price_irr_snapshot?: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  action_type: string;
  project_id?: string;
  project_inquiry_id?: string;
  meta_json?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  actor_name?: string;
}

export interface Notification {
  id: string;
  type: string;
  targetUserId: string;
  relatedProjectId?: string;
  relatedInquiryId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface InquiryStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface ProjectDetailsResponse {
  project: Project;
  status_history: ProjectStatusHistory[];
  comments: ProjectComment[];
  inquiries: ProjectInquiry[];
}

interface StoreState {
  currentUser: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginAsAdmin: () => Promise<boolean>;
  logout: () => void;
  fetchInitialData: () => Promise<void>;
}

// --- API Helpers ---
const qs = (params: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      p.append(key, String(value));
    }
  });
  return p.toString();
};

async function callApi(path: string, params: Record<string, any> = {}) {
  const url = `${BASE_API}?path=${encodeURIComponent(path)}&${qs(params)}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    return await res.json();
  } catch (error) {
    console.error("API Call Error:", error);
    return { ok: false, message: "خطای شبکه یا عدم دسترسی به سرور" };
  }
}

async function callProtected(path: string, params: Record<string, any> = {}) {
  const token = localStorage.getItem('AUTH_TOKEN');
  
  if (!token) {
    return { ok: false, message: "عدم احراز هویت. لطفا وارد شوید." };
  }

  const clientInfo = {
    user_agent: navigator.userAgent,
  };

  const r = await callApi(path, { ...params, token, ...clientInfo });

  if (!r.ok && (r.error_code === 'SESSION_EXPIRED' || r.error_code === 'INVALID_SESSION' || (r.message || '').includes('Session'))) {
    // Token expired or invalid
    localStorage.removeItem('AUTH_TOKEN');
    localStorage.removeItem('USER');
    return { ok: false, message: "نشست کاربری منقضی شده است. لطفا مجددا وارد شوید." };
  }
  return r;
}

const getUserFromStorage = (): User | null => {
  try {
    const stored = localStorage.getItem('USER');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
};

// --- Exported API Methods ---

export const api = {
  checkHealth: () => callApi('/health'),
  
  // Auth
  login: (username: string, password: string) => callApi('/auth/login', { username, password }),
  adminLogin: () => callApi('/auth/admin_token', { key: LOGIN_GET_KEY }),

  // Users
  getUsers: () => callProtected('/admin/users/list'),
  getStaffList: () => callProtected('/users/staff'),
  createUser: (data: Partial<User>) => callProtected('/admin/users/create', data),
  deleteUser: (id: string) => callProtected('/admin/users/delete', { id }),

  // Categories
  getCategories: () => callProtected('/categories/list'),
  getAdminCategories: () => callProtected('/admin/categories/list'),
  createCategory: (data: Partial<Category>) => callProtected('/admin/categories/create', data),
  updateCategory: (data: Partial<Category>) => callProtected('/admin/categories/update', data),
  deleteCategory: (id: string) => callProtected('/admin/categories/delete', { id }),

  // Devices
  getDevices: () => callProtected('/devices/list'),
  getAdminDevices: () => callProtected('/admin/devices/list'),
  searchDevices: (query: string, category_id?: string) => callProtected('/devices/search', { query, category_id }),
  createDevice: (data: Partial<Device>) => callProtected('/admin/devices/create', data),
  deleteDevice: (id: string) => callProtected('/admin/devices/delete', { id }),

  // Settings
  getSettings: () => callProtected('/admin/settings/get'),
  updateSettings: (data: Partial<Settings>) => callProtected('/admin/settings/update', data),

  // Projects
  getProjects: () => callProtected('/projects/list'),
  createProject: (data: Partial<Project>) => callProtected('/projects/create', data),
  getProjectDetails: (id: string) => callProtected('/projects/detail', { id }),
  approveProject: (project_id: string, note: string) => callProtected('/projects/approve', { project_id, note }),
  rejectProject: (project_id: string, note: string) => callProtected('/projects/reject', { project_id, note }),
  
  // Comments
  addComment: (project_id: string, body: string, parent_comment_id?: string) => callProtected('/comments/add', { project_id, body, parent_comment_id }),

  // Inquiries
  addInquiry: (project_id: string, device_id: string, quantity: number) => callProtected('/inquiries/quote', { project_id, device_id, quantity }),
  getPendingInquiries: () => callProtected('/admin/inquiries/pending'),
  getAllInquiries: (status_filter?: string) => callProtected('/admin/inquiries/list', { status_filter }),
  getInquiryStats: () => callProtected('/admin/inquiries/stats'),
  approveInquiry: (inquiry_id: string) => callProtected('/admin/inquiries/approve', { inquiry_id }),
  rejectInquiry: (inquiry_id: string, reason: string) => callProtected('/admin/inquiries/reject', { inquiry_id, reason }),

  // Notifications
  getNotifications: () => callProtected('/notifications/list'),
  markNotificationRead: (id: string) => callProtected('/notifications/mark_read', { id }),

  // Audit
  getAuditLogs: () => callProtected('/admin/audit/list'),
};

// --- Store ---
export const useStore = create<StoreState>((set) => ({
  currentUser: getUserFromStorage(),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const res = await api.login(username, password);
      
      if (res.ok && res.data?.token && res.data?.user) {
        localStorage.setItem('AUTH_TOKEN', res.data.token);
        localStorage.setItem('USER', JSON.stringify(res.data.user));
        set({ currentUser: res.data.user });
        set({ isLoading: false });
        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
      return false;
    }
  },

  loginAsAdmin: async () => {
    set({ isLoading: true });
    try {
      const res = await api.adminLogin();
      
      if (res.ok && res.data?.token && res.data?.user) {
        localStorage.setItem('AUTH_TOKEN', res.data.token);
        localStorage.setItem('USER', JSON.stringify(res.data.user));
        set({ currentUser: res.data.user });
        set({ isLoading: false });
        return true;
      } else {
        set({ isLoading: false });
        return false;
      }
    } catch (e) {
      console.error(e);
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('AUTH_TOKEN');
    localStorage.removeItem('USER');
    set({ currentUser: null });
  },

  fetchInitialData: async () => {
    // Placeholder
  }
}));
