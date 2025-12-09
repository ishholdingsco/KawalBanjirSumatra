#!/usr/bin/env python3
"""
News Scraping Script for Kawal Banjir Sumatra
Scrapes news from DuckDuckGo and X (Twitter) using Gemini and Grok AI
Then inserts to Airtable Status_Log table
"""

import os
import sys
import json
import time
from datetime import datetime, timedelta
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Third-party imports
try:
    from duckduckgo_search import DDGS
    import trafilatura
    from fuzzywuzzy import process, fuzz
    import google.generativeai as genai
    from pydantic import BaseModel, Field
    from pyairtable import Api
    from xai_sdk import Client
    from xai_sdk.tools import x_search
    from xai_sdk.chat import user as xai_user
except ImportError as e:
    print(f"❌ Missing required Python package: {e}")
    print("Please install: pip install duckduckgo-search trafilatura fuzzywuzzy pyairtable google-generativeai xai-sdk python-dotenv pydantic")
    sys.exit(1)

# ============================================================================
# CONFIGURATION
# ============================================================================

# API Keys from environment variables
GOOGLE_API_KEY = os.getenv('GEMINI_API_KEY')
GROK_API_KEY = os.getenv('GROK_API_KEY')
AIRTABLE_API_KEY = os.getenv('AIRTABLE_API_KEY')
AIRTABLE_BASE_ID = os.getenv('AIRTABLE_BASE_ID')

# Validate required environment variables
if not GOOGLE_API_KEY:
    print("❌ GEMINI_API_KEY not found in environment variables")
    sys.exit(1)
if not GROK_API_KEY:
    print("❌ GROK_API_KEY not found in environment variables")
    sys.exit(1)
if not AIRTABLE_API_KEY:
    print("❌ AIRTABLE_API_KEY not found in environment variables")
    sys.exit(1)
if not AIRTABLE_BASE_ID:
    print("❌ AIRTABLE_BASE_ID not found in environment variables")
    sys.exit(1)

# Configure Gemini
genai.configure(api_key=GOOGLE_API_KEY)

# Airtable setup
api = Api(AIRTABLE_API_KEY)
status_log_table = api.table(AIRTABLE_BASE_ID, 'Status_Log')
locations_table = api.table(AIRTABLE_BASE_ID, 'Locations')

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class FloodEvent(BaseModel):
    """Model for flood event extracted from news"""
    location: str = Field(
        description="The specific location of the flood. Must include the District (Kecamatan) if available."
    )
    event_time: str = Field(
        description="The specific time of the flood. in format of YYYY-MM-DDThh:mm:ss"
    )
    category: str = Field(
        description="Must be one of: 'Access', 'Aid/Relief', 'Flood Level', 'Official'"
    )
    details: str = Field(
        description="Short summary in 1-2 sentence on what happened in the disaster"
    )

class XPost(BaseModel):
    """Model for X/Twitter post"""
    location: str = Field(
        description="The specific location of the flood. Only state the lowest level: District (Kecamatan) or City (Kota or Kabupaten) or Province (Provinsi)."
    )
    event_time: str = Field(
        description="The specific time of the flood. in format of YYYY-MM-DDThh:mm:ss"
    )
    category: str = Field(
        description="Must be one of: 'Access', 'Aid/Relief', 'Flood Level', 'Official'"
    )
    details: str = Field(
        description="Short summary in 1-2 sentence on what happened in the disaster"
    )
    source: str = Field(
        description="url to original X post"
    )

class XPosts(BaseModel):
    """Container for multiple X posts"""
    posts: List[XPost]

# ============================================================================
# LOCATION MATCHING
# ============================================================================

# Global variable to cache locations
loc_id = {}

def load_locations():
    """Load all locations from Airtable and create lookup dict"""
    global loc_id
    print("📍 Loading locations from Airtable...")

    try:
        all_locations = locations_table.all()
        loc_id = {}

        for loc in all_locations:
            loc_name = loc['fields'].get('Loc Name', '').lower()
            if loc_name:
                loc_id[loc_name] = loc['id']

        print(f"✅ Loaded {len(loc_id)} locations")
    except Exception as e:
        print(f"❌ Error loading locations: {e}")
        sys.exit(1)

def get_match_location(query: str) -> tuple:
    """
    Find best matching location using fuzzy matching
    Returns: (location_name, score)
    """
    if not loc_id:
        load_locations()

    choices = list(loc_id.keys())
    best_matches = process.extract(query, choices, limit=2)

    if best_matches:
        best_location = best_matches[0]
        return best_location

    return (None, 0)

# ============================================================================
# GEMINI AI EXTRACTION
# ============================================================================

def extract_flood_data(news_text: str) -> List[dict]:
    """
    Extract flood events from news text using Gemini AI
    """
    try:
        model = genai.GenerativeModel("models/gemini-2.0-flash-exp")

        prompt = f"""
You are a crisis analyst. Extract events from the text below.

CRITICAL RULES:
- Return a LIST of objects.
- 'category' MUST be exactly one of: 'Access', 'Aid/Relief', 'Flood Level', 'Official'.
- If no specific location is found, use 'Indonesia'.
- 'event_time' MUST be exactly in the format of 'YYYY-MM-DDThh:mm:ss'

Input Text:
{news_text}
"""

        result = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=list[FloodEvent]
            )
        )

        return json.loads(result.text)

    except Exception as e:
        print(f"❌ Error extracting flood data with Gemini: {e}")
        return []

# ============================================================================
# DUCKDUCKGO NEWS SCRAPING
# ============================================================================

def scrape_ddg_news(query: str = "Banjir Sumatera", max_results: int = 15) -> List[dict]:
    """
    Scrape news from DuckDuckGo
    """
    print(f"\n🔍 Scraping DuckDuckGo for: {query}")
    news_articles = []

    try:
        ddgs = DDGS()
        news_gen = ddgs.news(
            query=query,
            region="id-id",
            safesearch="off",
            timelimit="d",  # Last 24 hours
            max_results=max_results
        )

        for article in news_gen:
            url = article.get('url', '')
            title = article.get('title', '')
            source = article.get('source', '')
            date = article.get('date', '')

            print(f"  📰 {title[:60]}...")

            # Download and extract content
            downloaded = trafilatura.fetch_url(url)

            if downloaded:
                body_text = trafilatura.extract(downloaded)
                if body_text:
                    article_md = f"""
# {title}
**Source:** {source} | **Date:** {date}
[Read Original Article]({url})

{body_text}

---
"""
                    article['body'] = article_md
                else:
                    article['body'] = 'ERR'
            else:
                article['body'] = 'ERR'

            news_articles.append(article)

            # Be polite to servers
            time.sleep(1)

        print(f"✅ Scraped {len(news_articles)} news articles from DuckDuckGo")

    except Exception as e:
        print(f"❌ Error scraping DuckDuckGo: {e}")

    return news_articles

# ============================================================================
# X (TWITTER) SCRAPING WITH GROK
# ============================================================================

def scrape_x_news(query: str = "banjir sumatra", limit: int = 10, mode: str = "Latest") -> List[dict]:
    """
    Scrape X (Twitter) posts using Grok AI
    """
    print(f"\n🐦 Scraping X (Twitter) for: {query}")

    try:
        client = Client(api_key=GROK_API_KEY)

        # Calculate time range for past 24 hours
        now = datetime.utcnow()
        from_date = now - timedelta(hours=24)

        # Create chat with x_search tool
        chat = client.chat.create(
            model="grok-2-1212",
            tools=[x_search(from_date=from_date)]
        )

        prompt = f"""
Perform a search on X for '{query}' using the x_search tool.
Focus on {mode} posts from the past 24 hours.
Then, extract and return a list of up to {limit} relevant posts.
Each post should include text, date, username, and url.
"""

        chat.append(xai_user(prompt))

        # Parse response
        response, parsed = chat.parse(XPosts)
        posts = [post.model_dump() for post in parsed.posts]

        print(f"✅ Scraped {len(posts)} posts from X")
        return posts

    except Exception as e:
        print(f"❌ Error scraping X with Grok: {e}")
        return []

# ============================================================================
# AIRTABLE INSERTION
# ============================================================================

def insert_to_airtable_from_news(news_articles: List[dict]) -> int:
    """
    Insert news articles to Airtable after extracting flood data with Gemini
    Returns: number of records inserted
    """
    inserted_count = 0

    for news in news_articles:
        if news.get('body') == 'ERR':
            continue

        # Extract flood events using Gemini
        flood_events = extract_flood_data(news['body'])

        for event in flood_events:
            try:
                # Get event time
                event_time = event.get('event_time') or news.get('date', datetime.now().isoformat())

                # Match location
                location_query = event.get('location', '').lower()
                location, score = get_match_location(location_query)

                # Only insert if location match is good enough
                if score > 95 and location:
                    new_record = {
                        "Headline": news.get('title', 'News Article'),
                        "Locations": [loc_id[location]],
                        "Event Time": event_time,
                        "Details": event.get('details', ''),
                        "Category": event.get('category', 'Official'),
                        "Source Link": news.get('url', '')
                    }

                    # Insert to Airtable
                    response = status_log_table.create(new_record)
                    inserted_count += 1
                    print(f"  ✅ Inserted: {location} - {event.get('category')}")
                else:
                    print(f"  ⚠️  Skipped (low score {score}): {location_query}")

            except Exception as e:
                print(f"  ❌ Error inserting record: {e}")

    return inserted_count

def insert_to_airtable_from_x(x_posts: List[dict]) -> int:
    """
    Insert X posts to Airtable
    Returns: number of records inserted
    """
    inserted_count = 0

    for news in x_posts:
        try:
            locations = news.get('location', '').lower().split(', ')
            check = False
            new_record = None

            # Try to find Kecamatan first
            for location in locations:
                if 'kecamatan' in location:
                    location_query = location.replace('kecamatan ', '').strip()
                    matched_location, score = get_match_location(location_query)

                    if score > 95 and matched_location:
                        new_record = {
                            "Headline": "X thread",
                            "Locations": [loc_id[matched_location]],
                            "Event Time": news.get('event_time', datetime.now().isoformat()),
                            "Details": news.get('details', ''),
                            "Category": news.get('category', 'Official'),
                            "Source Link": news.get('source', '')
                        }
                        check = True
                        break

            # If no Kecamatan found, use last location
            if not check and locations:
                matched_location, score = get_match_location(locations[-1])

                if score > 80 and matched_location:
                    new_record = {
                        "Headline": "X thread",
                        "Locations": [loc_id[matched_location]],
                        "Event Time": news.get('event_time', datetime.now().isoformat()),
                        "Details": news.get('details', ''),
                        "Category": news.get('category', 'Official'),
                        "Source Link": news.get('source', '')
                    }

            # Insert to Airtable
            if new_record:
                response = status_log_table.create(new_record)
                inserted_count += 1
                print(f"  ✅ Inserted X post: {matched_location}")

        except Exception as e:
            print(f"  ❌ Error inserting X post: {e}")

    return inserted_count

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """
    Main execution function
    """
    print("=" * 80)
    print("🌊 KAWAL BANJIR SUMATRA - NEWS SCRAPING")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

    # Load locations first
    load_locations()

    total_inserted = 0

    # 1. Scrape DuckDuckGo News
    print("\n" + "=" * 80)
    print("PHASE 1: DuckDuckGo News Scraping")
    print("=" * 80)
    ddg_news = scrape_ddg_news(query="Banjir Sumatera", max_results=15)
    ddg_inserted = insert_to_airtable_from_news(ddg_news)
    total_inserted += ddg_inserted
    print(f"\n📊 DuckDuckGo: Inserted {ddg_inserted} records")

    # 2. Scrape X (Twitter)
    print("\n" + "=" * 80)
    print("PHASE 2: X (Twitter) Scraping")
    print("=" * 80)
    x_posts = scrape_x_news(query="banjir sumatra", limit=10)
    x_inserted = insert_to_airtable_from_x(x_posts)
    total_inserted += x_inserted
    print(f"\n📊 X (Twitter): Inserted {x_inserted} records")

    # Summary
    print("\n" + "=" * 80)
    print("✅ SCRAPING COMPLETED")
    print("=" * 80)
    print(f"📊 Total records inserted: {total_inserted}")
    print(f"   - DuckDuckGo: {ddg_inserted}")
    print(f"   - X (Twitter): {x_inserted}")
    print(f"📅 Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

if __name__ == "__main__":
    main()
