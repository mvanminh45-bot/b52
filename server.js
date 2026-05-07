const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { duDoanTaiXiu } = require('./thuattoan');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper lấy sessions từ API
async function getSessions(url) {
    try {
        const res = await axios.get(url, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return res.data?.list || [];   // Dùng .list theo cấu trúc API thật
    } catch (error) {
        console.error(`Lỗi lấy dữ liệu từ ${url}:`, error.message);
        return [];
    }
}

// ==================== ENDPOINT TÀI XỈU MD5 ====================
app.get('/taixiumd5', async (req, res) => {
    try {
        const sessions = await getSessions('https://wtxmd52.tele68.com/v1/txmd5/sessions');
        
        if (sessions.length === 0) {
            return res.status(500).json({ error: "Không lấy được dữ liệu từ API MD5" });
        }

        const latest = sessions[0];                    // Phiên mới nhất
        const phienHienTai = Number(latest.id) + 1;

        // Lấy lịch sử kết quả để thuật toán học cầu
        const history = sessions.map(s => s.resultTruyenThong || "");

        const duDoan = duDoanTaiXiu(history);

        // Lấy dữ liệu xúc xắc thật
        const dices = latest.dices || [0, 0, 0];

        res.json({
            phien: Number(latest.id),
            xuc_xac_1: dices[0],
            xuc_xac_2: dices[1],
            xuc_xac_3: dices[2],
            tong: Number(latest.point || 0),
            ket_qua: latest.resultTruyenThong || "Chưa có",
            phien_hien_tai: phienHienTai,
            du_doan: duDoan.prediction,
            do_tin_cay: duDoan.confidence
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            phien: 0,
            xuc_xac_1: 0,
            xuc_xac_2: 0,
            xuc_xac_3: 0,
            tong: 0,
            ket_qua: "Lỗi",
            phien_hien_tai: 0,
            du_doan: "Lỗi kết nối",
            do_tin_cay: 0
        });
    }
});

// ==================== ENDPOINT TÀI XỈU THƯỜNG ====================
app.get('/taixiu', async (req, res) => {
    try {
        const sessions = await getSessions('https://wtx.tele68.com/v1/tx/sessions');
        
        if (sessions.length === 0) {
            return res.status(500).json({ error: "Không lấy được dữ liệu từ API Tài Xỉu" });
        }

        const latest = sessions[0];
        const phienHienTai = Number(latest.id) + 1;

        const history = sessions.map(s => s.resultTruyenThong || "");

        const duDoan = duDoanTaiXiu(history);

        const dices = latest.dices || [0, 0, 0];

        res.json({
            phien: Number(latest.id),
            xuc_xac_1: dices[0],
            xuc_xac_2: dices[1],
            xuc_xac_3: dices[2],
            tong: Number(latest.point || 0),
            ket_qua: latest.resultTruyenThong || "Chưa có",
            phien_hien_tai: phienHienTai,
            du_doan: duDoan.prediction,
            do_tin_cay: duDoan.confidence
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            phien: 0,
            xuc_xac_1: 0,
            xuc_xac_2: 0,
            xuc_xac_3: 0,
            tong: 0,
            ket_qua: "Lỗi",
            phien_hien_tai: 0,
            du_doan: "Lỗi kết nối",
            do_tin_cay: 0
        });
    }
});

// ==================== ENDPOINT BOTH ====================
app.get('/both', async (req, res) => {
    try {
        const [md5Sessions, txSessions] = await Promise.all([
            getSessions('https://wtxmd52.tele68.com/v1/txmd5/sessions'),
            getSessions('https://wtx.tele68.com/v1/tx/sessions')
        ]);

        // MD5
        const md5Latest = md5Sessions[0] || {};
        const md5History = md5Sessions.map(s => s.resultTruyenThong || "");
        const md5DuDoan = duDoanTaiXiu(md5History);
        const md5Dices = md5Latest.dices || [0,0,0];

        const md5Data = {
            phien: Number(md5Latest.id || 0),
            xuc_xac_1: md5Dices[0],
            xuc_xac_2: md5Dices[1],
            xuc_xac_3: md5Dices[2],
            tong: Number(md5Latest.point || 0),
            ket_qua: md5Latest.resultTruyenThong || "Chưa có",
            phien_hien_tai: Number(md5Latest.id || 0) + 1,
            du_doan: md5DuDoan.prediction,
            do_tin_cay: md5DuDoan.confidence
        };

        // Tài Xỉu thường
        const txLatest = txSessions[0] || {};
        const txHistory = txSessions.map(s => s.resultTruyenThong || "");
        const txDuDoan = duDoanTaiXiu(txHistory);
        const txDices = txLatest.dices || [0,0,0];

        const txData = {
            phien: Number(txLatest.id || 0),
            xuc_xac_1: txDices[0],
            xuc_xac_2: txDices[1],
            xuc_xac_3: txDices[2],
            tong: Number(txLatest.point || 0),
            ket_qua: txLatest.resultTruyenThong || "Chưa có",
            phien_hien_tai: Number(txLatest.id || 0) + 1,
            du_doan: txDuDoan.prediction,
            do_tin_cay: txDuDoan.confidence
        };

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            taixiumd5: md5Data,
            taixiu: txData
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi lấy dữ liệu cả hai", error: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({
        message: "Server Tài Xỉu API - Sử dụng dữ liệu thật từ API",
        endpoints: {
            "/taixiumd5": "Tài Xỉu MD5",
            "/taixiu": "Tài Xỉu thường",
            "/both": "Cả hai cùng lúc"
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
    console.log(`   → MD5      : http://localhost:${PORT}/taixiumd5`);
    console.log(`   → Tài Xỉu  : http://localhost:${PORT}/taixiu`);
    console.log(`   → Cả hai   : http://localhost:${PORT}/both`);
});