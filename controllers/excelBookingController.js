import ExcelJS from "exceljs";
import db from "../config/prisma.js";

export const downloadEventsExcel = async (req, res) => {
    try {
        const { month, year, search = "", filter } = req.body;

        if (!month || !year) {
            return res.status(400).json({
                success: false,
                message: "Month and Year are required",
            });
        }

        // ------------------ WHERE CLAUSE ------------------
        let whereClause = `
        WHERE MONTH(e.created_at) = ?
        AND YEAR(e.created_at) = ?
      `;
        let params = [month, year];

        // 🔍 Search filter
        if (search) {
            whereClause += `
          AND (
            LOWER(u.firstname) LIKE ?
            OR LOWER(u.lastname) LIKE ?
            OR LOWER(u.email) LIKE ?
            OR LOWER(p.title) LIKE ?
            OR LOWER(et.title) LIKE ?
          )
        `;
            const term = `%${search.toLowerCase()}%`;
            params.push(term, term, term, term, term);
        }

        // 🔹 Product ID filter
        if (filter) {
            whereClause += ` AND p.id = ?`;
            params.push(filter);
        }

        // ------------------ QUERY ------------------
        const [rows] = await db.execute(
            `
        SELECT
          e.id AS event_id,
          CONCAT(u.firstname, ' ', u.lastname) AS user_name,
          u.email,
          p.title AS product_name,
          et.title AS event_type,
          e.start_date,
          e.end_date,
          e.total_price,
          CASE 
            WHEN e.is_approved = 1 THEN 'Approved'
            ELSE 'Pending'
          END AS status,
          e.created_at
        FROM Event e
        JOIN Users u ON u.id = e.userId
        JOIN Product p ON p.id = e.productId
        JOIN EventType et ON et.id = e.eventTypeId
        ${whereClause}
        ORDER BY e.created_at DESC
        `,
            params
        );

        // ------------------ CREATE EXCEL ------------------
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Events Report");

        worksheet.columns = [
            { header: "Event ID", key: "event_id", width: 10 },
            { header: "User Name", key: "user_name", width: 22 },
            { header: "Email", key: "email", width: 28 },
            { header: "Product", key: "product_name", width: 25 },
            { header: "Event Type", key: "event_type", width: 18 },
            { header: "Start Date", key: "start_date", width: 15 },
            { header: "End Date", key: "end_date", width: 15 },
            { header: "Total Price", key: "total_price", width: 15 },
            { header: "Status", key: "status", width: 12 },
            { header: "Created At", key: "created_at", width: 20 },
        ];

        // 🧩 Add rows
        rows.forEach((row) => {
            worksheet.addRow({
                ...row,
                start_date: new Date(row.start_date).toLocaleDateString(),
                end_date: new Date(row.end_date).toLocaleDateString(),
                created_at: new Date(row.created_at).toLocaleString(),
            });
        });

        // 🎨 Style header
        worksheet.getRow(1).font = { bold: true };

        // 📤 Response headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=events_${month}_${year}.xlsx`
        );

        // Send Excel file
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Excel export error:", error);
        res.status(500).json({
            success: false,
            message: "Excel download failed",
        });
    }
};



export const getAllProductsForBooking = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT id, title
      FROM Product
      ORDER BY updated_at DESC
    `);

        res.json(
            rows
        );
    } catch (error) {
        console.error("getAllProducts error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch products"
        });
    }
};
