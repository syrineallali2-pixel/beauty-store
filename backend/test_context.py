"""
Automated Multi-Turn Conversation & Robustness Test Bench for Beauty API
"""
import requests
import json

URL = "http://localhost:8080/recommend"

# We can now test both multi-turn chat threads and single-turn edge cases
CONVERSATIONAL_SCENARIOS = [
    {
        "name": "Multi-Turn Context Test (Your Target Scenario)",
        "turns": [
            "matte lipstick",
            "under $25",
            "suggestions for a clubbing night look"
        ]
    },
    {
        "name": "Negation + Feature Shift Thread",
        "turns": [
            "I want a foundation that doesn't look cakey",
            "actually make it a satin finish",
            "is there anything under $20?"
        ]
    },
    {
        "name": "Single Ingress Security - SQL Injection",
        "turns": ["'; DROP TABLE products; --"]
    },
    {
        "name": "Single Ingress Security - XSS Attempt",
        "turns": ["<script>alert('XSS')</script>"]
    }
]

print("🧪 Starting Conversational Memory & Robustness Testing...\n")

for i, scenario in enumerate(CONVERSATIONAL_SCENARIOS, 1):
    print(f"============================================================")
    print(f"🧵 Test Scenario #{i}: {scenario['name']}")
    print(f"============================================================")
    
    # Initialize an empty message history for this chat session
    chat_history = []
    
    for turn_idx, user_query in enumerate(scenario["turns"], start=1):
        print(f"\n👉 Turn {turn_idx} -> User Says: '{user_query}'")
        
        # Append the new user message to our simulated stateful history
        chat_history.append({"role": "user", "content": user_query})
        
        payload = {
            "messages": chat_history,
            "top_k": 2
        }
        
        try:
            response = requests.post(URL, json=payload, timeout=12)
            
            if response.status_code == 200:
                data = response.json()
                advice = data.get("advice", "")
                products = data.get("products", [])
                
                print(f"   🤖 Advisor: {advice}")
                print(f"   📦 Retrieved Matches ({len(products)} total):")
                
                if products:
                    for idx, product in enumerate(products, start=1):
                        name = product.get('name', 'Unknown')
                        brand = product.get('brand', 'Unknown')
                        price = product.get('price', 0.0)
                        print(f"      🔹 #{idx}: {name} ({brand}) | ${price:.2f}")
                else:
                    print("      ❌ (No database products met these exact parameters)")
                
                # Append the assistant's reply to chat history to preserve conversation flow
                chat_history.append({"role": "assistant", "content": advice})
                
            else:
                print(f"   🔴 Request Failed | Status Code: {response.status_code}")
                if response.text:
                    print(f"      Detail: {response.text}")
                break # Break out of conversation loop if endpoint errors out
                
        except Exception as e:
            print(f"   💥 Connection/Runtime Crash on this turn: {str(e)}")
            break
            
    print("\n" + "-" * 60 + "\n")

print("🏁 Multi-Turn Test Suite Execution Complete!")