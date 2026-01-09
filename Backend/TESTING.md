# File API Quick Tests

Notes: Ensure dependencies are installed (`npm install`) and server is started (`npm run dev` or `node server.js`). Use a valid JWT generated from login.

1) Upload file (sender)

curl -X POST http://localhost:3000/api/files/send \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "receiver=<RECEIVER_USER_ID>" \
  -F "file=@/path/to/local-file.png"

- Expected: 201 JSON with `_id`, `originalFileName`, `fileSize`, `mimeType`, `createdAt`.

2) Get inbox (receiver)

curl -X GET http://localhost:3000/api/files/inbox \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

- Expected: 200 JSON array of file metadata (no filePath or storedFileName exposed).

3) Download file (receiver)

curl -X GET http://localhost:3000/api/files/download/<FILE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>" --output downloaded-file

- Expected: File stream downloaded, content-disposition `attachment; filename="originalName"`.

Troubleshooting:
- If `MODULE_NOT_FOUND: multer` appears, run `npm install` in the project root (use Command Prompt on Windows if PowerShell execution policy blocks npm).
- Ensure `uploads/` is writeable by the process.
