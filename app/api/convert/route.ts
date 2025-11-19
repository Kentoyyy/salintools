import { NextRequest, NextResponse } from "next/server";

const CLOUDCONVERT_API_BASE = "https://api.cloudconvert.com/v2";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;
    const targetFormat = form.get("targetFormat")?.toString().toLowerCase();

    if (!file || !targetFormat) {
      return NextResponse.json(
        { error: "Missing file or target format." },
        { status: 400 }
      );
    }

    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "CloudConvert API key is not configured." },
        { status: 500 }
      );
    }

    const originalName = file.name;
    const inputFormat =
      originalName.split(".").pop()?.toLowerCase() || "png";

    // 🔥 1) CREATE JOB — MUST be JSON body, NOT FormData
    const jobResponse = await fetch(`${CLOUDCONVERT_API_BASE}/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: {
          "upload-in": {
            operation: "import/upload",
          },
          "convert-file": {
            operation: "convert",
            input: "upload-in",
            input_format: inputFormat,
            output_format: targetFormat,
          },
          "export-out": {
            operation: "export/url",
            input: "convert-file",
          },
        },
      }),
    });

    if (!jobResponse.ok) {
      const err = await jobResponse.json().catch(() => null);
      return NextResponse.json(
        { error: err?.message || "Failed to create job." },
        { status: jobResponse.status }
      );
    }

    const jobData = await jobResponse.json();
    const taskUpload = jobData.data.tasks.find(
      (t: any) => t.name === "upload-in"
    );

    if (!taskUpload?.result?.form?.url) {
      return NextResponse.json(
        { error: "Failed to get upload URL." },
        { status: 500 }
      );
    }

    const uploadUrl = taskUpload.result.form.url;
    const uploadParams = taskUpload.result.form.parameters;

    // 🔥 2) UPLOAD FILE to CloudConvert upload URL
    const uploadForm = new FormData();
    for (const key in uploadParams) {
      uploadForm.append(key, uploadParams[key]);
    }

    uploadForm.append(
      "file",
      new Blob([await file.arrayBuffer()], { type: file.type }),
      originalName
    );

    await fetch(uploadUrl, {
      method: "POST",
      body: uploadForm,
    });

    // 🔥 3) WAIT FOR PROCESSING
    const jobId = jobData.data.id;
    const exportFile = await waitForExportFile(jobId, apiKey);

    if (!exportFile?.url) {
      return NextResponse.json(
        { error: "Failed to get converted file URL." },
        { status: 500 }
      );
    }

    // 🔥 4) DOWNLOAD FILE
    const convertedResponse = await fetch(exportFile.url);
    const convertedBuffer = await convertedResponse.arrayBuffer();

    return new NextResponse(convertedBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          convertedResponse.headers.get("Content-Type") ||
          `image/${targetFormat}`,
        "Content-Disposition": `attachment; filename="${exportFile.filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Conversion failed." },
      { status: 500 }
    );
  }
}

async function waitForExportFile(jobId: string, apiKey: string) {
  const maxAttempts = 20;
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${CLOUDCONVERT_API_BASE}/jobs/${jobId}?include=tasks`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    const job = await res.json();
    const tasks = job?.data?.tasks || [];

    const exp = tasks.find((t: any) => t.name === "export-out");

    if (exp?.status === "finished") return exp.result.files[0];
    if (exp?.status === "error") throw new Error("CloudConvert conversion error.");

    await delay(1000);
  }

  throw new Error("Timed out waiting for CloudConvert.");
}
