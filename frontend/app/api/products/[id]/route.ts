import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Await params to ensure compatibility with Next.js 15+
    const resolvedParams = await params; 
    const id = resolvedParams.id;

    // Fetch all columns for this specific single product
    const query = `
      SELECT *
      FROM products 
      WHERE id = $1
      LIMIT 1;
    `;
    
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (error: any) {
    console.error('Single Product fetch error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch product details' }, { status: 500 });
  }
}
