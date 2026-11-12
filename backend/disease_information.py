
import html
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


# Some model labels use names different from MedlinePlus titles.
DISEASE_ALIASES = {
    "AIDS": "HIV",
    "Bronchial Asthma": "Asthma",
    "Chicken pox": "Chickenpox",
    "Dimorphic hemorrhoids(piles)": "Hemorrhoids",
    "Drug Reaction": "Drug Reactions",
    "Fungal infection": "Fungal Infections",
    "Hypertension": "High Blood Pressure",
    "Paralysis (brain hemorrhage)": "Stroke",
    "Peptic ulcer disease": "Peptic Ulcer",
    "Typhoid": "Typhoid Fever",
    "Urinary tract infection": "Urinary Tract Infections",
    "Vertigo (Paroxysmal Positional Vertigo)": "Dizziness and Vertigo",
}

# Cache results for 24 hours.
_CACHE = {}
CACHE_DURATION = 24 * 60 * 60

BASE_URL = "https://wsearch.nlm.nih.gov/ws/query"


def clean_html(value):
    """Convert HTML summaries into readable plain text."""
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]*>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def normalize(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def get_disease_information(disease):
    """
    Retrieve disease information from the MedlinePlus
    health topics service.
    """

    search_name = DISEASE_ALIASES.get(disease, disease)

    cache_key = normalize(search_name)

    cached = _CACHE.get(cache_key)

    if cached and time.time() - cached["time"] < CACHE_DURATION:
        return cached["data"]

    fallback = {
        "available": False,
        "title": disease,
        "summary": (
            "Verified disease information is not currently "
            "available for this condition. Please consult a "
            "qualified healthcare professional."
        ),
        "source": "MedlinePlus",
        "source_url": "https://medlineplus.gov/healthtopics.html",
    }

    try:
        params = urllib.parse.urlencode({
            "db": "healthTopics",
            "term": f'title:"{search_name}"',
            "retmax": 5,
            "rettype": "brief",
            "tool": "healthsymptomchecker",
        })

        url = f"{BASE_URL}?{params}"

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "HealthSymptomChecker/1.0"
            },
        )

        with urllib.request.urlopen(request, timeout=5) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)

        for document in root.findall(".//document"):
            title = ""
            summary = ""

            for content in document.findall("content"):
                name = content.attrib.get("name", "")

                if name == "title":
                    title = clean_html(
                        "".join(content.itertext())
                    )

                elif name.lower() == "fullsummary":
                    summary = clean_html(
                        "".join(content.itertext())
                    )

            # Only accept a matching title.
            if normalize(title) != normalize(search_name):
                continue

            if not summary:
                continue

            result = {
                "available": True,
                "title": title,
                "summary": summary[:5000],
                "source": "MedlinePlus - U.S. National Library of Medicine",
                "source_url": document.attrib.get("url"),
            }

            _CACHE[cache_key] = {
                "time": time.time(),
                "data": result,
            }

            return result

    except Exception as error:
        print(
            f"Could not retrieve information for {disease}: {error}"
        )

    _CACHE[cache_key] = {
        "time": time.time(),
        "data": fallback,
    }

    return fallback
