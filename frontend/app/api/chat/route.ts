import { NextResponse } from 'next/server';



export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, max_price, top_k, history = [] } = body;

    // 1. Sanitize history to strictly match your Pydantic model (role and content only)
    const formattedHistory = history.map((msg: { role: string; content?: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user', // Ensure strict matching tags
      content: msg.content || '',
    }));

    // 2. Append the current active user intent turn into the conversation stack
    formattedHistory.push({
      role: 'user',
      content: query,
    });

    // 3. Construct payload matching the FastAPI validation schema exactly
    const backendPayload = {
      messages: formattedHistory,
      max_price: max_price !== undefined ? parseFloat(max_price) : null,
      top_k: top_k || 5,
    };

    // FIX: Point to port 8080 (Uvicorn) to match FastAPI backend configuration, using IPv4 string to bypass Node loopback blocks
    const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8080';

    // 4. Fire proxy-forward request to your FastAPI backend
    const response = await fetch(`${BACKEND_URL}/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendPayload),
    });

    // If backend throws an issue, pass that state along gracefully
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `FastAPI responded with status ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 5. Return structured data directly to AIChat.tsx
    return NextResponse.json(data);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Proxy Route Runtime Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error inside Next.js proxy route', details: errorMessage },
      { status: 500 }
    );
  }
}
