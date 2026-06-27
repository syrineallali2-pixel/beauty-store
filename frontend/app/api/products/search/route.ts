import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    let query: string;
    let values: any[];

    // If 'q' is empty (Explore button clicked)
    if (!q || q.trim() === '') {
      query = `
        SELECT id, name, brand, price, image_url, image_url AS image_link
        FROM products 
        LIMIT 40;
      `;
      values = [];
    } else {
      // If 'q' HAS text (User is searching via the search input box)
      query = `
        SELECT id, name, brand, price, image_url, image_url AS image_link
        FROM products 
        WHERE name ILIKE $1 OR brand ILIKE $1
        LIMIT 40;
      `;
      values = [`%${q}%`];
    }
    
    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);

  } catch (error: any) {
    console.error('Search error:', error.message);
    return NextResponse.json({ error: 'Failed to search products' }, { status: 500 });
  }
}
