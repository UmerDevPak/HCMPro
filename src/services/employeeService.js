import { isLiveFirebaseConfigured, db, auth, firebaseConfig } from "@/lib/firebase/client";
import { handleFirestoreError, isPermissionError, OperationType } from "@/lib/firebase/errorHandler";
import { isLiveUserHrOrAdmin } from "@/lib/firebase/roleCheck";
import { INITIAL_EMPLOYEES } from "@/lib/seedData";
import { generateId } from "@/lib/utils";
import { resolveAvatar } from "@/lib/avatarSystem";

const STORAGE_KEY = "hcm_lite_employees";

function getLocalEmployees() {
  if (typeof window === "undefined") return INITIAL_EMPLOYEES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_EMPLOYEES;
  }
}

function saveLocalEmployees(list) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

// In-memory cache & in-flight deduplication for ultra-fast employee directory rendering
let memoryEmployeesCache = null;
let lastEmployeesFetchTime = 0;
let inFlightEmployeesPromise = null;
const EMPLOYEES_CACHE_TTL_MS = 120000;

export const employeeService = {
  peekCachedEmployees({ search = "", department = "", status = "" } = {}) {
    if (!memoryEmployeesCache) return null;
    let list = [...memoryEmployeesCache];
    if (department) list = list.filter((e) => e.department === department);
    if (status) list = list.filter((e) => e.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.jobTitle?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async getAllEmployees({ search = "", department = "", status = "" } = {}, forceRefresh = false) {
    const now = Date.now();
    let list;

    if (!forceRefresh && memoryEmployeesCache && now - lastEmployeesFetchTime < EMPLOYEES_CACHE_TTL_MS) {
      list = [...memoryEmployeesCache];
    } else {
      if (!forceRefresh && inFlightEmployeesPromise) {
        list = [...(await inFlightEmployeesPromise)];
      } else {
        inFlightEmployeesPromise = (async () => {
          const localList = getLocalEmployees();

          if (isLiveFirebaseConfigured && db && auth?.currentUser) {
            try {
              const { collection, getDocs, query, where } = await import("firebase/firestore");
              const canListAll = await isLiveUserHrOrAdmin();
              const empQuery = canListAll
                ? collection(db, "employees")
                : query(collection(db, "employees"), where("uid", "==", auth.currentUser.uid));
              const snapshot = await Promise.race([
                getDocs(empQuery),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
              ]);
              if (!snapshot.empty) {
                const remoteList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                remoteList.forEach((rem) => {
                  const idx = localList.findIndex((l) => l.id === rem.id);
                  if (idx !== -1) {
                    localList[idx] = rem;
                  } else {
                    localList.unshift(rem);
                  }
                });
              }
            } catch (err) {
              if (isPermissionError(err)) {
                handleFirestoreError(err, OperationType.LIST, "employees");
              }
              console.warn("[employeeService] Firestore query error, falling back to local state:", err);
            }
          }

          memoryEmployeesCache = localList;
          lastEmployeesFetchTime = Date.now();
          return localList;
        })();

        try {
          list = [...(await inFlightEmployeesPromise)];
        } finally {
          inFlightEmployeesPromise = null;
        }
      }
    }

    if (department) list = list.filter((e) => e.department === department);
    if (status) list = list.filter((e) => e.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.jobTitle?.toLowerCase().includes(q)
      );
    }
    return list;
  },

  peekEmployeeById(id) {
    if (typeof window === "undefined" || !id) return null;
    const normalizedId = String(id).trim();
    const pool = memoryEmployeesCache || getLocalEmployees();
    return (
      pool.find(
        (e) =>
          e.id === normalizedId ||
          e.uid === normalizedId ||
          e.email?.toLowerCase() === normalizedId.toLowerCase()
      ) || null
    );
  },

  async getEmployeeById(id) {
    if (!id) return null;
    const normalizedId = String(id).trim();

    if (memoryEmployeesCache) {
      const cachedMatch = memoryEmployeesCache.find(
        (e) =>
          e.id === normalizedId ||
          e.uid === normalizedId ||
          e.email?.toLowerCase() === normalizedId.toLowerCase()
      );
      if (cachedMatch) return cachedMatch;
    }

    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, getDoc, collection, getDocs, query, where } = await import("firebase/firestore");
        const { getLiveUserAccess } = await import("@/lib/firebase/roleCheck");
        const access = await getLiveUserAccess();
        const canListAll = access.isHrOrAdmin;
        // Try direct doc id only when allowed (own uid or HR/Admin)
        if (/^[a-zA-Z0-9_-]{1,128}$/.test(normalizedId) && (canListAll || normalizedId === auth.currentUser.uid)) {
          const snap = await Promise.race([
            getDoc(doc(db, "employees", normalizedId)),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
          ]);
          if (snap.exists()) return { id: snap.id, ...snap.data() };
        }

        // Scope collection search for non-HR users
        const empQuery = canListAll
          ? collection(db, "employees")
          : query(collection(db, "employees"), where("uid", "==", auth.currentUser.uid));
        const allSnap = await Promise.race([
          getDocs(empQuery),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1200)),
        ]);
        const match = allSnap.docs.find((d) => {
          const item = d.data();
          return (
            d.id === normalizedId ||
            item.id === normalizedId ||
            item.uid === normalizedId ||
            item.email?.toLowerCase() === normalizedId.toLowerCase()
          );
        });
        if (match) return { id: match.id, ...match.data() };
      } catch (err) {
        if (isPermissionError(err)) {
          const { getLiveUserAccess } = await import("@/lib/firebase/roleCheck");
          const access = await getLiveUserAccess().catch(() => ({ hasProfile: false }));
          if (access.hasProfile) {
            handleFirestoreError(err, OperationType.GET, `employees/${normalizedId}`);
          }
        }
        console.warn("[employeeService] getEmployeeById fallback:", err.message || err);
      }
    }

    const list = getLocalEmployees();
    return (
      list.find(
        (e) =>
          e.id === normalizedId ||
          e.uid === normalizedId ||
          e.email?.toLowerCase() === normalizedId.toLowerCase()
      ) || null
    );
  },

  async getEmployeeByEmail(email) {
    if (!email) return null;
    return this.getEmployeeById(email);
  },

  /**
   * Activates employee when they log in and change their password
   */
  async activateEmployee(emailOrId) {
    if (!emailOrId) return null;
    const emp = await this.getEmployeeById(emailOrId);
    if (!emp) return null;

    return this.updateEmployee(emp.id, {
      status: "Active",
      mustChangePassword: false,
      activatedAt: new Date().toISOString(),
    });
  },

  async createEmployee(data) {
    const newId = `EMP-${String(Math.floor(Math.random() * 900) + 100)}`;
    const tempPassword = data.temporaryPassword || `HCM-${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;
    const cleanEmail = (data.email || "").trim().toLowerCase();

    const empName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || data.name || "Unnamed Employee";
    const assignedAvatar = resolveAvatar({
      src: data.avatar,
      name: empName,
      email: cleanEmail,
      id: newId,
      gender: data.gender,
    });

    const newEmp = {
      id: newId,
      name: empName,
      email: cleanEmail,
      hireDate: data.hireDate || new Date().toISOString().split("T")[0],
      avatar: assignedAvatar,
      currency: "USD",
      temporaryPassword: tempPassword,
      mustChangePassword: true,
      ...data,
      status: "Pending Activation",
    };

    if (isLiveFirebaseConfigured && db) {
      let authUid = newId;

      // 1. Provision Auth User in Firebase Auth using isolated secondary app instance
      try {
        const { initializeApp, deleteApp } = await import("firebase/app");
        const { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } = await import("firebase/auth");
        const appName = `sec_auth_${Date.now()}`;
        const secApp = initializeApp(firebaseConfig, appName);
        const secAuth = getAuth(secApp);

        const cred = await createUserWithEmailAndPassword(secAuth, cleanEmail, tempPassword);
        authUid = cred.user.uid;
        await updateProfile(cred.user, { displayName: newEmp.name });
        await signOut(secAuth);
        await deleteApp(secApp);
      } catch (authErr) {
        console.warn("[employeeService] Secondary auth user provision notice:", authErr.message);
      }

      // 2. Persist record to Cloud Firestore
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const recordToSave = { ...newEmp, uid: authUid, avatar: assignedAvatar };

        await setDoc(doc(db, "employees", newId), recordToSave);
        if (authUid !== newId) {
          await setDoc(doc(db, "employees", authUid), recordToSave);
        }

        await setDoc(doc(db, "users", authUid), {
          uid: authUid,
          email: cleanEmail,
          displayName: newEmp.name,
          role: newEmp.role || "Employee",
          employeeId: newId,
          jobTitle: newEmp.jobTitle || "Team Member",
          department: newEmp.department || "General",
          mustChangePassword: true,
          temporaryPassword: tempPassword,
          status: "Pending Activation",
          avatar: assignedAvatar,
          createdAt: new Date().toISOString(),
        });

        memoryEmployeesCache = null;
        return { ...newEmp, uid: authUid, temporaryPassword: tempPassword };
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.WRITE, `employees/${newId}`);
        }
        console.warn("[employeeService] Firestore create notice:", err);
      }
    }

    const current = getLocalEmployees();
    const updated = [newEmp, ...current];
    saveLocalEmployees(updated);
    memoryEmployeesCache = null;
    return newEmp;
  },

  async updateEmployee(id, updates) {
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "employees", id), updates);
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.UPDATE, `employees/${id}`);
        }
        console.warn("[employeeService] Firestore update fallback:", err);
      }
    }

    const current = getLocalEmployees();
    const index = current.findIndex((e) => e.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      saveLocalEmployees(current);
      memoryEmployeesCache = null;
      return current[index];
    }
    return null;
  },

  async deleteEmployee(id) {
    if (isLiveFirebaseConfigured && db && auth?.currentUser) {
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "employees", id));
      } catch (err) {
        if (isPermissionError(err)) {
          handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
        }
        console.warn("[employeeService] Firestore delete fallback:", err);
      }
    }

    const current = getLocalEmployees();
    const filtered = current.filter((e) => e.id !== id);
    saveLocalEmployees(filtered);
    memoryEmployeesCache = null;
    return true;
  },

  async getDepartmentsSummary() {
    const employees = await this.getAllEmployees();
    const counts = {};
    employees.forEach((emp) => {
      const dept = emp.department || "Other";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return counts;
  },
};
