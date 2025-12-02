# Kawal Banjir Sumatra

Sistem Monitoring Banjir Real-time untuk Pulau Sumatra - Platform untuk melaporkan dan memantau kondisi banjir secara crowdsourced dengan visualisasi peta interaktif.

## Fitur

- **Peta Interaktif**: Visualisasi lokasi banjir menggunakan Mapbox
- **Timeline Real-time**: Laporan bencana ditampilkan berdasarkan waktu kejadian
- **Search & Filter**: Cari laporan berdasarkan lokasi atau deskripsi
- **Responsive Design**: Tampilan optimal untuk desktop dan mobile
- **Crowdsourced Data**: Masyarakat dapat berkontribusi melaporkan kondisi banjir
- **Severity Levels**: Kategorisasi tingkat keparahan banjir
- **Media Support**: Dukungan untuk URL gambar dokumentasi

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS + shadcn/ui
- Mapbox GL JS
- Axios
- Lucide Icons

### Backend
- Node.js + Express
- MongoDB + Mongoose
- CORS

## Prerequisites

- Node.js (v16 atau lebih baru)
- MongoDB (lokal atau MongoDB Atlas)
- Mapbox Account (untuk API token)

## Setup Instructions

### 1. Clone Repository

```bash
git clone <repository-url>
cd KawalBanjirSumatra
```

### 2. Setup Environment Variables

Copy `.env.example` ke `.env` di root folder:

```bash
cp .env.example .env
```

Edit `.env` dan isi dengan konfigurasi Anda:

```env
# Backend Configuration
MONGODB_URI=mongodb://localhost:27017/kawal-banjir
PORT=5000

# Frontend Configuration (Mapbox)
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
VITE_API_URL=http://localhost:5000/api
```

**Mendapatkan Mapbox Access Token:**
1. Buat akun di [Mapbox](https://www.mapbox.com/)
2. Pergi ke [Account Dashboard](https://account.mapbox.com/)
3. Copy Default Public Token atau buat token baru

### 3. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 4. Setup MongoDB

**Opsi 1: MongoDB Lokal**
- Install MongoDB di komputer Anda
- Jalankan MongoDB service
- Gunakan URI: `mongodb://localhost:27017/kawal-banjir`

**Opsi 2: MongoDB Atlas (Cloud)**
- Buat cluster di [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Dapatkan connection string
- Update `MONGODB_URI` di `.env`

### 5. Run the Application

#### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```
Backend akan berjalan di `http://localhost:5000`

#### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend akan berjalan di `http://localhost:5173`

### 6. Test the Application

Buka browser dan akses `http://localhost:5173`

## Project Structure

```
KawalBanjirSumatra/
├── backend/
│   ├── models/
│   │   └── Report.js          # MongoDB schema untuk laporan banjir
│   ├── routes/
│   │   └── reports.js         # API endpoints
│   ├── server.js              # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map.jsx        # Komponen peta Mapbox
│   │   │   ├── Sidebar.jsx    # Sidebar timeline
│   │   │   └── SearchBar.jsx  # Search component
│   │   ├── lib/
│   │   │   └── utils.js       # Utility functions
│   │   ├── App.jsx            # Main component
│   │   └── index.css          # Global styles
│   └── package.json
├── .env.example               # Template environment variables
├── .gitignore
└── README.md
```

## API Endpoints

### Get All Reports
```http
GET /api/reports
```

### Get Report by ID
```http
GET /api/reports/:id
```

### Get Nearby Reports
```http
GET /api/reports/nearby?lng=101.5&lat=0.5&maxDistance=50000
```

### Create New Report
```http
POST /api/reports
Content-Type: application/json

{
  "timestamp": "2025-12-02T10:30:00.000Z",
  "location": {
    "type": "Point",
    "coordinates": [101.5, 0.5]
  },
  "locationName": "Kota Padang",
  "description": "Banjir setinggi 50cm di jalan utama",
  "imageUrls": [
    "https://example.com/image1.jpg"
  ],
  "contactSource": "John Doe - 08123456789",
  "category": "banjir",
  "severity": "sedang"
}
```

### Update Report
```http
PUT /api/reports/:id
Content-Type: application/json
```

### Delete Report
```http
DELETE /api/reports/:id
```

### Get Statistics
```http
GET /api/reports/stats/summary
```

## Data Schema

### Report Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | Date | Yes | Waktu kejadian banjir |
| location | GeoJSON | Yes | Koordinat lokasi [longitude, latitude] |
| locationName | String | Yes | Nama lokasi |
| description | String | Yes | Deskripsi kondisi banjir |
| imageUrls | Array | No | URL gambar dokumentasi |
| contactSource | String | Yes | Kontak/sumber informasi |
| category | String | Yes | Kategori: banjir, banjir-bandang, longsor, lainnya |
| severity | String | Yes | Tingkat keparahan: ringan, sedang, berat, sangat-berat |

## User Stories

Project ini dirancang untuk melayani berbagai stakeholder:

1. **Donatur**: Mencari organisasi di daerah terdampak untuk donasi
2. **Masyarakat dengan keluarga di lokasi**: Memantau kondisi tempat tinggal kerabat
3. **Masyarakat umum**: Mengetahui keadaan lokasi secara keseluruhan
4. **Jurnalis**: Mendapatkan informasi terkini untuk publikasi
5. **Pemerintah lokal**: Mengumpulkan informasi dari warga
6. **NGO**: Koordinasi bantuan bencana
7. **Korban**: Dokumentasi untuk asuransi dan mencari bantuan

## Development

### Backend Development
```bash
cd backend
npm run dev  # Using nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Build for Production

#### Frontend
```bash
cd frontend
npm run build
```

#### Backend
```bash
cd backend
npm start
```

## Contributing

Kontribusi sangat diterima! Silakan:
1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

## License

MIT License

## Contact

Untuk pertanyaan dan dukungan, silakan buka issue di repository ini.

## Acknowledgments

- [Mapbox](https://www.mapbox.com/) untuk peta interaktif
- [shadcn/ui](https://ui.shadcn.com/) untuk UI components
- Semua kontributor dan masyarakat yang melaporkan kondisi banjir
