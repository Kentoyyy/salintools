import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.REMOVEBG_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const bytes = Buffer.from(buffer);

    // Call remove.bg API
    const removeFormData = new FormData();
    removeFormData.append('image_file', new Blob([bytes], { type: file.type }));
    removeFormData.append('size', 'auto');
    removeFormData.append('format', 'png');

    const removeResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: removeFormData,
    });

    if (!removeResponse.ok) {
      const error = await removeResponse.text();
      console.error('Remove.bg API error:', error);
      return NextResponse.json(
        { error: 'Failed to remove background' },
        { status: removeResponse.status }
      );
    }

    // Get the processed image
    const processedImage = await removeResponse.arrayBuffer();

    // Return the image with appropriate headers
    return new NextResponse(processedImage, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="removed-bg.png"',
      },
    });
  } catch (error) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
