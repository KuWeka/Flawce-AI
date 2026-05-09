import { GoogleGenAI, Type } from "@google/genai";
import { TransactionType } from "../lib/types";

// Initialize AI
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intent: { 
      type: Type.STRING, 
      enum: ['record', 'query', 'chat', 'create_account', 'create_goal', 'create_category', 'create_budget'], 
      description: 'record: transaksi, query: tanya data, chat: ngobrol, create_account: buat akun baru, create_goal: buat target tabungan, create_category: buat kategori baru, create_budget: buat anggaran' 
    },
    transactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['income', 'expense'] },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          accountId: { type: Type.STRING }
        },
        required: ['type', 'amount', 'category', 'description', 'accountId']
      },
      description: 'Daftar transaksi yang perlu dicatat.'
    },
    accountData: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        balance: { type: Type.NUMBER },
        type: { type: Type.STRING, enum: ['bank', 'ewallet', 'cash'] },
        icon: { type: Type.STRING }
      },
      required: ['name', 'balance']
    },
    goalData: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        targetAmount: { type: Type.NUMBER },
        currentAmount: { type: Type.NUMBER },
        deadline: { type: Type.STRING, description: 'Format YYYY-MM-DD' },
        icon: { type: Type.STRING }
      },
      required: ['name', 'targetAmount']
    },
    categoryData: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['income', 'expense', 'both'] },
        icon: { type: Type.STRING }
      },
      required: ['name', 'type']
    },
    budgetData: {
      type: Type.OBJECT,
      properties: {
        category: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        period: { type: Type.STRING, enum: ['daily', 'weekly', 'monthly'] }
      },
      required: ['category', 'amount', 'period']
    },
    queryType: {
      type: Type.STRING,
      enum: ['balance', 'spending_history', 'income_history', 'budget_status', 'comparison'],
      description: 'Tipe data yang ditanyakan oleh user'
    },
    success: { type: Type.BOOLEAN },
    message: { type: Type.STRING, description: 'Jawaban bot langsung kepada user' }
  },
  required: ['intent', 'success', 'message']
};

export async function chatWithAI(input: string, context: { 
  userName: string, 
  balance: number, 
  recentTransactions: any[],
  budgets: any[],
  categories?: string[],
  accounts?: any[]
}) {
  try {
    const systemInstruction = `Anda adalah "Flowce AI", pakar keuangan pribadi yang cerdas dan analitis.
    Tujuan Anda adalah membantu pengguna mengelola uang mereka dengan "flow" yang lancar. Tagline: "Track less, flow more".
    
    DATA PENGGUNA:
    - Nama: ${context.userName}
    - Saldo Total: Rp ${context.balance.toLocaleString()}
    - Anggaran Aktif: ${JSON.stringify(context.budgets)}
    - Kategori Tersedia: ${context.categories ? context.categories.join(', ') : 'Gunakan kategori standar'}
    - Akun Tersedia: ${context.accounts ? JSON.stringify(context.accounts.map(a => ({ id: a.id, name: a.name }))) : 'Tunai'}
    - Tanggal Hari Ini: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
    
    TUGAS ANDA:
    1. RECORD: Mencatat transaksi pengeluaran/pemasukan.
    2. CREATE_ACCOUNT: Jika user ingin menambah akun/dompet baru (cth: "tambah gopay saldo 50rb").
    3. CREATE_GOAL: Jika user ingin menabung untuk sesuatu (cth: "target beli hp 3jt").
    4. CREATE_CATEGORY: Jika user ingin kategori baru (cth: "buat kategori hobi").
    5. CREATE_BUDGET: Jika user ingin membatasi pengeluaran (cth: "anggaran makan 1jt per bulan").
    6. QUERY/CHAT: Tanya jawab & analisis data.

    HANDLING TYPO/PHONETIC:
    - Jika user menyebut "sibeng", "sea beng", "si bang", "seabank", "si bank", asumsikan itu adalah "Sea Bank".
    - Jika Anda menemukan nama akun atau kategori yang mirip (phonetically identical) dengan yang ada di DATA PENGGUNA tapi typo sedikit, gunakan yang paling mendekati dan beritahu user di pesan konfirmasi/jawaban Anda.
    - Jika benar-benar ragu, tanya user untuk konfirmasi di dalam field 'message'.

    CONTOH INPUT:
    - "target beli sepatu 500rb sampai 20 mei" -> intent: create_goal, goalData: {name: "Beli Sepatu", targetAmount: 500000, deadline: "2026-05-20"}
    - "tambah akun dana saldo 23500" -> intent: create_account, accountData: {name: "Dana", balance: 23500, type: "ewallet"}
    - "anggaran mei maksimal 1.5jt" -> intent: create_budget, budgetData: {category: "Semua", amount: 1500000, period: "monthly"}
    - "buat kategori topupgame" -> intent: create_category, categoryData: {name: "Topup Game", type: "expense"}
    
    EKSTRAKSI: Selalu bersihkan nama dari kata perintah (cth: "buatkan kategori traveling" -> name: "Traveling").
    
    RESPON: Harus format JSON sesuai RESPONSE_SCHEMA. 'message' harus ramah dalam Bahasa Indonesia.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: input,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini Error:', error);
    return {
      intent: 'chat',
      success: false,
      message: "Maaf, sistem AI sedang sibuk. Bisa diulangi lagi?"
    };
  }
}

export async function getMonthlyReview(data: {
  month: string,
  totalIncome: number,
  totalExpense: number,
  topCategories: { category: string, amount: number }[],
  budgetsStatus: { category: string, limit: number, spent: number }[]
}) {
  try {
    const prompt = `Berikan analisis keuangan bulanan yang personal dan emosional (seperti teman tapi profesional) untuk bulan ${data.month}.
    
    STATISTIK:
    - Total Pemasukan: Rp ${data.totalIncome.toLocaleString()}
    - Total Pengeluaran: Rp ${data.totalExpense.toLocaleString()}
    - Top 3 Pengeluaran: ${data.topCategories.slice(0, 3).map(c => `${c.category} (Rp ${c.amount.toLocaleString()})`).join(', ')}
    - Status Anggaran: ${data.budgetsStatus.map(b => `${b.category}: ${Math.round((b.spent/b.limit)*100)}% terpakai`).join(', ')}
    
    FORMAT RESPON:
    {
      "rating": number (1-10),
      "summary": "String ringkasan singkat",
      "praise": "Apa yang dilakukan dengan baik",
      "warning": "Apa yang perlu diperbaiki",
      "tip": "Satu tips actionable untuk bulan depan",
      "mood": "Stiker/Emoji yang menggambarkan (cth: 🤑, 😅, 📉)"
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah pakar keuangan yang memberikan review bulanan. Berikan jawaban dalam JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            praise: { type: Type.STRING },
            warning: { type: Type.STRING },
            tip: { type: Type.STRING },
            mood: { type: Type.STRING }
          },
          required: ['rating', 'summary', 'praise', 'warning', 'tip', 'mood']
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Review Error:', error);
    throw error;
  }
}

export async function analyzeReceiptImage(base64Image: string, mimeType: string) {
  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.NUMBER },
        description: { type: Type.STRING },
        category: { type: Type.STRING },
        date: { type: Type.STRING }
      },
      required: ['amount', 'description', 'category', 'date']
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          { text: "Kamu adalah asisten ekstrak data struk belanja. Dari gambar struk/nota ini, ekstrak: total belanja (amount), deskripsi/nama toko (description), kategori pengeluaran (category), dan tanggal (date dalam format YYYY-MM-DD). Return JSON saja." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Analyze Receipt Error:', error);
    throw error;
  }
}

export async function parseTransactionRequest(input: string, categories?: string[], accounts?: any[]) {
  return chatWithAI(input, { userName: '', balance: 0, recentTransactions: [], budgets: [], categories, accounts });
}
