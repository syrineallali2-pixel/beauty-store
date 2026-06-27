import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    // Attempt to query the database
    const query = `
      SELECT id, name, brand, price, image_url 
      FROM products 
      WHERE image_url IS NOT NULL AND image_url != ''
      ORDER BY RANDOM() 
      LIMIT 15;
    `;
    
    const result = await pool.query(query);
    return NextResponse.json(result.rows);

  } catch (error: any) {
    // CRITICAL: This will print the specific database error to your terminal
    console.error('DATABASE CONNECTION FAILED:', error.message);
    
    return NextResponse.json(
      { error: 'Failed to fetch', details: error.message }, 
      { status: 500 }
    );
  }
}
