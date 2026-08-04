# Model Card: Fallback Music Recommender

## 1. Model Name

Resonance Room Local Recommender (originally What You Are)

---

## 2. Intended Use

This deterministic fallback recommends songs from a small bundled catalog. It is the default recommendation path in the public frontend and the backup path in optional FastAPI mode when Anthropic or Last.fm is unavailable. It assumes that a listener's current preferences can be approximated through genre, mood, energy, valence, tempo, danceability, and acousticness targets.

It is suitable for product fallback behavior, transparent demonstrations, and deterministic testing. It is not a production-scale personalization model.

## 3. How the Model Works

Every song in the catalog gets a score out of 9 points based on how well it matches what the user told us they like. The system looks at seven things about each song: its genre, its mood, how energetic it sounds, how acoustic or electronic it feels, how happy or sad the tone is, its tempo in beats per minute, and how danceable it is. For each of those, it checks how close the song is to the user's preferred value. 
Genre and mood work differently: they're worth fixed bonus points (2 points for a genre match, 1 for mood) because those labels reflect a whole style and not just a number. Once all seven scores are added up, every song in the catalog has a total, they're sorted highest to lowest, and a diversity check removes duplicate artists before the requested number is returned. The classroom product requests six recommendations; the standalone evaluation defaults to five. The Python evaluator can build a plain-English explanation from the strongest scoring factors. The current static song rows return title and artist without those per-song explanations.

## 4. Data

The catalog contains 18 synthetic songs. Static mode stores them in `web/src/recommendations/songCatalog.js`. The Python backend and evaluator store the same records in `data/songs.csv`.

**Genres represented:** pop, lofi, rock, ambient, jazz, synthwave, indie pop, r&b, electronic, folk, hip-hop, metal, classical, latin, soul

**Moods represented:** happy, chill, intense, relaxed, moody, focused, romantic, energetic, melancholic, confident, angry, peaceful, uplifting, nostalgic

**What was added:** The 8 new songs were chosen to fill gaps. Each new song also introduced a mood not previously present.

**What is still missing:** The catalog reflects a narrow slice of global music taste. There is no K-pop, reggae, country, blues, or any non-Western genre. All songs are in English (implied). Moods like "bittersweet," "tense," or "dreamy" are absent. The data was also created synthetically so the numeric values were not measured from actual audio, so they may not reflect how these songs truly sound. 

---

## 5. Strengths

The system works best for listeners with a clear, consistent taste. For these users, multiple features point in the same direction at once, so the top results score very high and feel obviously right. The scoring also does a good job separating genres that are acoustically very different: lofi and metal will almost never share a top-5 list because their energy, acousticness, and tempo values are worlds apart. The genre and mood bonuses add a useful anchor so that similar songs rise above technically close but tonally wrong ones. The Python evaluator's explanations also make its rankings easier to inspect.

## 6. Limitations and Bias

### Single targets cannot represent varied listening habits

The profile stores one number per feature. A user who loves both intense workout sessions and calm study sessions would set their energy target somewhere in the middle (say, 0.65) — which is actually the least characteristic value for them. The system then recommends mid-energy songs that don't fully satisfy either mood. Real recommenders handle this with multiple profiles, session context, or time-of-day signals. This one can't.

### Other limitations

1. Genre lock-in creates a 2-point ceiling for out-of-genre songs
2. Missing-genre users get a structurally lower maximum score
3. The energy gap is linear — it doesn't care about direction
4. Acousticness creates a hard acoustic/electronic wall
5. All features are scored independently and added together. The system silently picks the least-bad options without flagging a contradictory profile.

## 7. Evaluation

Six profiles were tested: three realistic listeners and three adversarial edge cases designed to stress the scoring logic. The detailed rankings and findings are recorded in the [fallback evaluation](fallback-evaluation.md).

### Profiles tested

| Profile | Genre | Mood | Energy |
| --- | --- | --- | --- |
| Chill Lofi Student | lofi | chill | 0.38 |
| High-Energy Pop Fan | pop | intense | 0.92 |
| Deep Intense Rock | rock | intense | 0.90 |
| Conflicted (high energy + melancholic mood) | metal | angry | 0.95 |
| Opera Fan (genre not in catalog) | opera | peaceful | 0.20 |
| The Average User (all targets at 0.5) | jazz | relaxed | 0.50 |

### Notable evaluation result

The opera fan test produced the most unexpected result. I expected the system to fail badly without a genre match. Instead, it quietly fell back on numeric features and surfaced Moonlit Serenade, which genuinely sounds like what an opera fan might also enjoy. That was not obvious from reading the code.

---

## 8. Future Work

One of the best ways to improve this product would be to allow each user to create multiple profiles. That way, recommendations could change depending on the time of day, mood, or activity, instead of giving only one general set of song suggestions. Another improvement would be to expand the song library so users get more variety. This could be done either by adding more songs directly to the dataset or by using an API to pull from existing music catalogs, which would also reduce the need to host all of the data inside the project. In addition, letting users rate songs or skip recommendations would help the system learn over time. By tracking this feedback, the recommendation engine could adjust its weights and better understand which features matter most to each individual user.

## 9. Development Observations

Working on this project helped me realize that both collaborative filtering and content-based filtering are intuitive in theory, but much more complex in practice. There are a lot of moving parts, and trying to build a system that accurately recommends songs for every user was honestly challenging. I ran into many variables that I didn’t initially account for, which made the system harder to fine-tune than expected.

It also gave me a better appreciation for platforms like Spotify and Apple Music. They have access to massive amounts of user data, which allows them to continuously tweak and optimize their recommendation systems. That level of data makes a huge difference when trying to personalize results at scale.

One of the most important things I noticed is how sensitive recommendation systems are to parameter changes. Even small adjustments to weights in the model could completely change the output. The code itself might stay the same, but shifting a few values can lead to very different recommendations. That made me realize how fragile these systems can be. It also explains why users sometimes feel like recommendations suddenly get worse—small backend adjustments can have noticeable effects.

I’ve personally experienced this with features like Spotify’s DJ mode. Most of the time, it recommends songs I enjoy, but occasionally it suggests songs that don’t match my preferences at all. What’s interesting is that sometimes the “vibe” of the song feels right, but other aspects—like lyrics or style—do not.
