import os
import json
import urllib.request
import urllib.error

def load_env(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ.setdefault(key.strip(), val.strip())

load_env('.env.local')
load_env('../.env')

TOKEN = os.environ.get('SUPABASE_ACCESS_TOKEN', '')
PROJECT_REF = 'qdnwmfriilknnwqrepuy'
URL = f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query'

def run_sql(sql):
    req = urllib.request.Request(
        URL,
        data=json.dumps({'query': sql}).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {TOKEN}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            return json.loads(data)
    except urllib.error.HTTPError as e:
        return {'error': e.read().decode('utf-8'), 'code': e.code}
    except Exception as e:
        return {'error': str(e)}

READINGS = [
  {
    "sign": "Aries",
    "ruler": "Mars (Mangal)",
    "element": "Fire",
    "quality": "Cardinal",
    "overview": "As an Aries Ascendant, you are guided by Mars, the planet of courage, vitality, and pioneering action. Your life orientation is marked by authentic independence, swift initiative, and an instinctive drive to lead rather than follow.",
    "personality_traits": "You project an energetic, direct, and straightforward presence. You naturally cut through ambiguity and speak your mind with refreshing honesty. When confronted with obstacles, your first reaction is to take constructive action. You inspire others with your courage and infectious enthusiasm, preferring real-world momentum over prolonged hesitation.",
    "life_path_guidance": "Your soul path in this lifetime revolves around conscious leadership, mastering patience, and learning to balance spontaneous impulses with steady long-term wisdom. Your relationships thrive when you cultivate active listening and give room for mutual compromise without fearing loss of autonomy.",
    "strengths": ["Natural courage and resilience in times of uncertainty", "Decisive problem solver with exceptional clarity of purpose", "Pioneering mindset that fearlessly ventures into new territories", "Warmhearted, transparent, and protective towards loved ones"],
    "growth_areas": ["Channeling natural restlessness into disciplined, sustainable routines", "Practicing mindful pause before reacting in emotionally charged moments", "Recognizing that true strength often lies in patience and collaborative grace"]
  },
  {
    "sign": "Taurus",
    "ruler": "Venus (Shukra)",
    "element": "Earth",
    "quality": "Fixed",
    "overview": "With Taurus rising, your chart is anchored by Venus, the planet of harmony, beauty, value, and devotion. You embody grounded grace, unwavering loyalty, and an organic connection to material and emotional security.",
    "personality_traits": "You carry a calm, soothing, and reassuring presence that immediately puts others at ease. Methodical and thoughtful, you do not rush your choices; you build your life brick by brick with enduring craftsmanship. You possess refined aesthetic discernment and deeply appreciate sensory harmony, natural beauty, and tranquil environments.",
    "life_path_guidance": "Your life path is one of steady cultivation, building enduring prosperity, and finding authentic self-worth. Cultivating flexibility and allowing room for healthy transformation will help you release resistance to change when life invites you to evolve.",
    "strengths": ["Unshakable dependability and steadfast loyalty", "Deeply grounded practical intellect and financial prudence", "Sophisticated eye for aesthetics, balance, and artistic beauty", "Calming emotional presence that anchors those around you"],
    "growth_areas": ["Embracing necessary life transitions without excessive attachment to the familiar", "Remaining open to alternate viewpoints and agile compromises", "Balancing physical comfort with active renewal and mindful movement"]
  },
  {
    "sign": "Gemini",
    "ruler": "Mercury (Budha)",
    "element": "Air",
    "quality": "Mutable",
    "overview": "Rising in Gemini, your soul's lens is illuminated by Mercury, the planet of intellect, language, and curiosity. You are an agile thinker, gifted communicator, and natural weaver of ideas, perspectives, and human connections.",
    "personality_traits": "You exude a youthful, vibrant, and intellectually curious aura. Your mind moves with remarkable speed, continuously absorbing information and spotting innovative linkages that others miss. You are versatile, witty, and naturally diplomatic, capable of relating to people from all walks of life.",
    "life_path_guidance": "Your primary life lessons center on depth over breadth. While your capacity for learning is boundless, your greatest breakthroughs will arrive when you channel your brilliant mind into committed mastery of your chosen craft.",
    "strengths": ["Exceptional verbal and written communication abilities", "High cognitive adaptability and lightning-fast learning curve", "Engaging conversationalist who naturally builds social bridges", "Curious, open-minded approach to diverse philosophies"],
    "growth_areas": ["Guarding against mental exhaustion by incorporating grounding silent practices", "Following through on core endeavors before jumping to the next inspiring concept", "Trusting intuitive feeling as much as analytical rationalization"]
  },
  {
    "sign": "Cancer",
    "ruler": "Moon (Chandra)",
    "element": "Water",
    "quality": "Cardinal",
    "overview": "With Cancer on the Ascendant, your chart is ruled by the Moon, the luminary of intuitive depth, nourishment, and emotional wisdom. You possess profound empathy and an instinctive ability to feel the emotional pulse of your surroundings.",
    "personality_traits": "You present a gentle, perceptive, and deeply compassionate presence. You are naturally protective of your family and inner sanctum, fiercely defending those you love. Your intuition is one of your greatest compasses, often sensing unsaid realities before words are spoken.",
    "life_path_guidance": "Your spiritual journey invites you to establish emotional self-sovereignty. As you honor your natural emotional tides without being overwhelmed by them, your innate nurturing capacity becomes an empowering light for yourself and your community.",
    "strengths": ["Extraordinary intuition and empathic intelligence", "Deep emotional loyalty and enduring family devotion", "Natural ability to create sacred, welcoming, and safe spaces", "Imaginative, poetic, and spiritually attuned perspective"],
    "growth_areas": ["Setting clear emotional boundaries to prevent taking on others' burdens", "Releasing past emotional grievances through forgiveness and flow", "Directly voicing needs rather than retreating into an introspective shell"]
  },
  {
    "sign": "Leo",
    "ruler": "Sun (Surya)",
    "element": "Fire",
    "quality": "Fixed",
    "overview": "Rising in Leo, your chart is guided by the Sun, the cosmic source of vitality, sovereignty, and purposeful self-expression. You radiate dignity, generous warmth, and an innate nobility of character.",
    "personality_traits": "You possess a magnetic and honorable presence. You lead naturally through benevolence rather than force, uplifting those around you with authentic encouragement. You take genuine pride in your integrity and desire your endeavors to leave a meaningful, uplifting impact on the world.",
    "life_path_guidance": "Your soul's calling is to shine as a warm, unconditional source of light. True leadership for a Leo Ascendant is realized when your inner confidence is anchored in spiritual purpose rather than external validation.",
    "strengths": ["Inspiring natural charisma, confidence, and radiant vitality", "Generous, noble heart that champions the well-being of others", "Unshakable sense of personal integrity and creative passion", "Natural mentor and encouraging protector of your inner circle"],
    "growth_areas": ["Accepting constructive feedback with an open, non-defensive mindset", "Sharing the spotlight and recognizing the quiet contributions of others", "Allowing yourself vulnerability and resting from the burden of always being strong"]
  },
  {
    "sign": "Virgo",
    "ruler": "Mercury (Budha)",
    "element": "Earth",
    "quality": "Mutable",
    "overview": "With Virgo rising, your chart is shaped by Mercury's analytical, discerning, and service-oriented expression. You approach life with structured observation, practical intellect, and a heartfelt devotion to helping and refining.",
    "personality_traits": "You project an observant, modest, and composed demeanor. You see the intricate details that make things work and possess an inherent gift for organization, health awareness, and systematic problem solving. You value competence, cleanliness, and thoughtful dependability.",
    "life_path_guidance": "Your higher path is one of selfless service merged with self-acceptance. By learning to celebrate 'good enough' and releasing unrealistic standards of perfection, your natural analytical genius turns into compassionate healing for yourself and others.",
    "strengths": ["Meticulous attention to detail and outstanding organizational acumen", "Practical, solution-oriented mind that excels under pressure", "Deeply conscientious work ethic and genuine commitment to service", "Health consciousness and natural aptitude for holistic systems"],
    "growth_areas": ["Softening the inner critic and practicing gentle self-compassion", "Stepping back from overthinking to see the expansive, beautiful whole", "Remembering that mistakes are sacred stepping stones toward mastery"]
  },
  {
    "sign": "Libra",
    "ruler": "Venus (Shukra)",
    "element": "Air",
    "quality": "Cardinal",
    "overview": "Rising in Libra, your life orientation is guided by Venus through the airy realms of equilibrium, justice, diplomacy, and graceful aesthetic harmony. You seek fairness and harmonious relationships in every sphere.",
    "personality_traits": "You embody a charming, refined, and naturally poised presence. You are an instinctive peacemaker who can see multiple sides of any situation with objective fairness. You have a profound appreciation for art, design, cultural elevation, and respectful collaboration.",
    "life_path_guidance": "Your essential growth lies in balancing partnership with personal conviction. You are invited to honor your personal truth and make decisive choices, knowing that authentic harmony sometimes requires voicing necessary truths.",
    "strengths": ["Natural diplomat with superior mediation and listening skills", "Sophisticated aesthetic taste, artistic sensibility, and charm", "Commitment to justice, balance, and equitable partnerships", "Polished social grace that makes everyone feel valued and heard"],
    "growth_areas": ["Making decisive choices without getting paralyzed by weighing options", "Expressing personal needs assertively instead of prioritizing people-pleasing", "Embracing healthy confrontation when integrity requires it"]
  },
  {
    "sign": "Scorpio",
    "ruler": "Mars & Ketu (Mangal & Ketu)",
    "element": "Water",
    "quality": "Fixed",
    "overview": "With Scorpio on the Ascendant, your chart is governed by Mars and co-ruled by Ketu in Vedic astrology. You are a soul of extraordinary psychological depth, transformative power, and unwavering spiritual determination.",
    "personality_traits": "You carry an intense, magnetic, and perceptive presence that pierces beneath surface illusions. You rarely engage in superficial chatter; you seek truth, authenticity, and profound connection. Resilient beyond measure, you have an innate capacity to rise from adversity transformed and stronger.",
    "life_path_guidance": "Your life is an alchemical journey of emotional mastery and spiritual rebirth. Learning to surrender control, trust the natural rhythm of life, and transmute intensity into healing wisdom is your highest destiny.",
    "strengths": ["Incredible psychological insight and radar for authenticity", "Unmatched resilience, inner courage, and transformative power", "Fierce, lifelong loyalty to those who earn your sacred trust", "Deep focus and investigative ability to master complex mysteries"],
    "growth_areas": ["Practicing conscious emotional forgiveness to release old grudges", "Opening up gradually to trust worthy individuals without guarded suspicion", "Channeling intense emotional energy into creative, spiritual regeneration"]
  },
  {
    "sign": "Sagittarius",
    "ruler": "Jupiter (Brihaspati / Guru)",
    "element": "Fire",
    "quality": "Mutable",
    "overview": "Rising in Sagittarius, your chart is graced by Jupiter, the great cosmic benefic and Guru of higher wisdom, philosophy, and optimism. You are a seeker of truth, lifelong explorer, and harbinger of hope.",
    "personality_traits": "You radiate an expansive, upbeat, and benevolent energy. You look toward life with a forward-looking horizon, believing in higher purpose and divine synchronicity. Honest, philosophical, and free-spirited, you inspire others to see the grander picture of their circumstances.",
    "life_path_guidance": "Your path is one of embodying authentic wisdom and teaching by living example. Grounding your lofty visions in practical, daily consistency will allow your philosophical insights to create lasting earthly impact.",
    "strengths": ["Infectious optimism and profound philosophical vision", "Broadminded, generous spirit with deep thirst for truth and wisdom", "Natural teacher, guide, and uplifting conversationalist", "Courage to explore unknown cultures, ideas, and spiritual depths"],
    "growth_areas": ["Cultivating tact when delivering direct, unfiltered truths", "Paying mindful attention to practical details alongside grand visions", "Staying committed through quiet, routine phases of long-term goals"]
  },
  {
    "sign": "Capricorn",
    "ruler": "Saturn (Shani)",
    "element": "Earth",
    "quality": "Cardinal",
    "overview": "With Capricorn rising, your chart is governed by Saturn, the planet of discipline, perseverance, time, and sacred duty (Karma). You are built for enduring achievement, structured responsibility, and lasting legacy.",
    "personality_traits": "You convey a mature, dignified, and trustworthy presence. Even in youth, you often display the wisdom of an elder. You respect time, honor commitments, and understand that anything truly worthwhile requires dedicated effort, patience, and deliberate focus.",
    "life_path_guidance": "Your evolutionary journey is one of ascending your chosen mountain with integrity. As you advance, integrating joyful spontaneity, warmth, and self-celebration into your disciplined framework enriches your heart and honors your soul.",
    "strengths": ["Unrivaled discipline, patience, and long-range strategic vision", "Rock-solid dependability and ethical accountability", "Quiet resilience that thrives where others surrender", "Mastery of organizational systems, practical leadership, and legacy building"],
    "growth_areas": ["Allowing yourself time for genuine leisure without feeling guilty", "Opening your heart to express warmth and vulnerability to loved ones", "Recognizing that your intrinsic worth is not defined solely by productivity"]
  },
  {
    "sign": "Aquarius",
    "ruler": "Saturn & Rahu (Shani & Rahu)",
    "element": "Air",
    "quality": "Fixed",
    "overview": "Rising in Aquarius, your chart is guided by Saturn and Rahu, merging structural responsibility with visionary innovation and humanitarian ideals. You are an independent thinker who looks toward the future of humanity.",
    "personality_traits": "You carry an original, egalitarian, and intellectual demeanor. You are deeply committed to fairness, collective well-being, and scientific or social progress. You value mental autonomy and honor each individual's uniqueness without conforming to arbitrary convention.",
    "life_path_guidance": "Your soul path is to serve as an agent of conscious innovation and community upliftment. Balancing your intellectual objectivity with heartfelt, one-on-one emotional intimacy brings wholeness to your relationships.",
    "strengths": ["Visionary intellect with out-of-the-box problem-solving talent", "Egalitarian values and dedication to collective progress", "Loyal, non-judgmental friend who celebrates diversity", "Capacity to remain calm and objective amidst chaotic environments"],
    "growth_areas": ["Connecting with and expressing personal, vulnerable emotions directly", "Avoiding emotional detachment when close partners seek reassurance", "Balancing grand ideals with compassionate patience for human imperfections"]
  },
  {
    "sign": "Pisces",
    "ruler": "Jupiter (Brihaspati / Guru)",
    "element": "Water",
    "quality": "Mutable",
    "overview": "With Pisces rising, your chart is illuminated by Jupiter in its spiritual, contemplative, and boundless ocean of compassion. You are an intuitive mystic, gentle healer, and dreamer with access to universal imagination.",
    "personality_traits": "You emanate a serene, gentle, and dreamlike aura. Highly receptive to subtle energies, music, and sacred art, you feel deeply and naturally empathize with the struggles of others. You bring a sense of spiritual mystery, poetry, and transcendence into everyday life.",
    "life_path_guidance": "Your spiritual lesson is to anchor your celestial intuition in grounded, earthly reality. By cultivating healthy energetic boundaries and practical grounding routines, your oceanic compassion becomes a steady, healing sanctuary.",
    "strengths": ["Profound spiritual intuition, empathy, and mystical depth", "Vibrant creative imagination and artistic or musical sensitivity", "Selfless compassion and natural ability to forgive and comfort", "Attunement to the unseen rhythms of the universe"],
    "growth_areas": ["Building strong personal boundaries to prevent energetic depletion", "Maintaining grounding practical routines to avoid escapism", "Seeing people and situations with clear discernment rather than through idealization"]
  }
]

def sql_str(val):
    if val is None:
        return "NULL"
    escaped = str(val).replace("'", "''")
    return f"'{escaped}'"

def sql_array(arr):
    if not arr:
        return "'{}'"
    items = ", ".join(sql_str(x) for x in arr)
    return f"ARRAY[{items}]"

def seed():
    values_list = []
    for r in READINGS:
        v = f"""(
          {sql_str(r['sign'])},
          {sql_str(r['ruler'])},
          {sql_str(r['element'])},
          {sql_str(r['quality'])},
          {sql_str(r['overview'])},
          {sql_str(r['personality_traits'])},
          {sql_str(r['life_path_guidance'])},
          {sql_array(r['strengths'])},
          {sql_array(r['growth_areas'])}
        )"""
        values_list.append(v)
    
    joined_values = ",\n".join(values_list)
    sql = f"""
    INSERT INTO public.ascendant_readings 
      (sign, ruler, element, quality, overview, personality_traits, life_path_guidance, strengths, growth_areas)
    VALUES 
      {joined_values}
    ON CONFLICT (sign) DO UPDATE SET
      ruler = EXCLUDED.ruler,
      element = EXCLUDED.element,
      quality = EXCLUDED.quality,
      overview = EXCLUDED.overview,
      personality_traits = EXCLUDED.personality_traits,
      life_path_guidance = EXCLUDED.life_path_guidance,
      strengths = EXCLUDED.strengths,
      growth_areas = EXCLUDED.growth_areas,
      updated_at = NOW();
    """
    res = run_sql(sql)
    print("Batch seed result:", res)


if __name__ == '__main__':
    seed()
