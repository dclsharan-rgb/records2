import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import Record from "@/models/Record";
import SchemaConfig from "@/models/SchemaConfig";
import { flattenRecordsForExcel } from "@/lib/records";
import * as XLSX from "xlsx";

function applyRecordFilters(records, searchParams) {
  const userId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const q = String(searchParams.get("q") || "").trim().toLowerCase();
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

  const filtered = records.filter((record) => {
    const createdAt = new Date(record.createdAt);
    if (userId && String(record.userId) !== String(userId)) return false;
    if (from && createdAt < new Date(from)) return false;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      if (createdAt > end) return false;
    }
    if (q) {
      const haystack = [
        record.recordId || record.id || String(record._id || ""),
        record.username || "",
        ...Object.values(record.values || {}).map((v) => String(v ?? "")),
        record.adminRemark || ""
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sort === "asc" ? diff : -diff;
  });
}

function workbookResponse(rows, fileName) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}

export const GET = withAuth(async (request, user) => {
  await dbConnect();
  const config = await SchemaConfig.findOne({ key: "default" }).lean();
  const fields = config?.fields || [];
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "mine";

  const mineRecords = await Record.find({ userId: user.id }).sort({ createdAt: -1 }).lean();

  if (mode === "mine") {
    return workbookResponse(
      flattenRecordsForExcel(mineRecords, fields, { includeAdminRemark: user.role === "admin" }),
      `${user.username}-records.xlsx`
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (mode === "consolidated") {
    const allRecords = await Record.find({}).sort({ createdAt: -1 }).lean();
    const filtered = applyRecordFilters(allRecords, url.searchParams);
    return workbookResponse(
      flattenRecordsForExcel(filtered, fields, { includeAdminRemark: true }),
      "consolidated-records.xlsx"
    );
  }

  if (mode === "user") {
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required for mode=user" }, { status: 400 });
    }
    const userRecords = await Record.find({ userId }).sort({ createdAt: -1 }).lean();
    return workbookResponse(
      flattenRecordsForExcel(userRecords, fields, { includeAdminRemark: true }),
      `user-${userId}-records.xlsx`
    );
  }

  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
});
