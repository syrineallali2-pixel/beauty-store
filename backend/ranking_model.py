"""
LEARNING-TO-RANK ENGINE
Scoring products based on multiple features
"""

from typing import List, Dict
import numpy as np

class RankingEngine:
    def __init__(self):
        # Weights for different signals
        self.weights = {
            "filter_match": 0.30,
            "personalization": 0.25,
            "popularity": 0.20,
            "rating": 0.15,
            "price_preference": 0.10
        }
    
    def calculate_filter_match_score(self, product: Dict, filters: Dict) -> float:
        """How well product matches explicit query filters"""
        score = 0.0
        matches = 0
        
        if filters.get('product_type') and product.get('product_type') == filters['product_type']:
            score += 1.0
            matches += 1
        
        if filters.get('color') and product.get('color') == filters['color']:
            score += 1.0
            matches += 1
        
        if filters.get('finish') and product.get('finish') == filters['finish']:
            score += 1.0
            matches += 1
        
        if filters.get('skin_tone') and filters['skin_tone'] in product.get('skin_tone_fit', []):
            score += 1.0
            matches += 1
        
        return score / max(matches, 1)
    
    def calculate_personalization_score(self, product: Dict, user_prefs: Dict) -> float:
        """Matches user's historical preferences"""
        if not user_prefs:
            return 0.5  # Neutral
        
        score = 0.0
        matches = 0
        
        favorite_colors = user_prefs.get('favorite_colors', [])
        if favorite_colors and product.get('color') in favorite_colors:
            score += 1.0
            matches += 1
        
        favorite_finish = user_prefs.get('favorite_finish', [])
        if favorite_finish and product.get('finish') in favorite_finish:
            score += 1.0
            matches += 1
        
        return score / max(matches, 1) if matches > 0 else 0.3
    
    def calculate_popularity_score(self, product: Dict) -> float:
        """Global popularity from interactions"""
        return product.get('popularity_score', 0.5)
    
    def calculate_rating_score(self, product: Dict) -> float:
        """Normalized rating (0-1)"""
        rating = product.get('rating', 0)
        return rating / 5.0
    
    def calculate_price_score(self, product: Dict, max_price: float = None) -> float:
        """Lower price = higher score (within budget)"""
        price = product.get('price', 50)
        
        if max_price and price > max_price:
            return 0.0  # Above budget, eliminate
        
        # Normalized: $0 = 1.0, $50 = 0.0
        return max(0, 1 - (price / 50))
    
    def rank(self, products: List[Dict], filters: Dict, user_prefs: Dict = None, max_price: float = None) -> List[Dict]:
        """Rank products using weighted scoring"""
        
        for product in products:
            # Apply price filter first
            if max_price and product.get('price', 0) > max_price:
                product['rank_score'] = -1  # Filtered out
                continue
            
            # Calculate individual scores
            filter_score = self.calculate_filter_match_score(product, filters)
            personalization_score = self.calculate_personalization_score(product, user_prefs or {})
            popularity_score = self.calculate_popularity_score(product)
            rating_score = self.calculate_rating_score(product)
            price_score = self.calculate_price_score(product, max_price)
            
            # Weighted final score
            product['rank_score'] = (
                self.weights['filter_match'] * filter_score +
                self.weights['personalization'] * personalization_score +
                self.weights['popularity'] * popularity_score +
                self.weights['rating'] * rating_score +
                self.weights['price_preference'] * price_score
            )
            
            # Store individual scores for debugging
            product['score_breakdown'] = {
                "filter_match": round(filter_score, 2),
                "personalization": round(personalization_score, 2),
                "popularity": round(popularity_score, 2),
                "rating": round(rating_score, 2),
                "price": round(price_score, 2)
            }
        
        # Filter out eliminated products and sort
        ranked = [p for p in products if p.get('rank_score', -1) >= 0]
        ranked.sort(key=lambda x: x.get('rank_score', 0), reverse=True)
        
        return ranked