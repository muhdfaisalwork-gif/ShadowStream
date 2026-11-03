import subprocess

urls = [
    ("The Message (1976) English Master 1080p", "https://archive.org/download/themessage1976/The.Message.1976.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4"),
    ("The Message (1976) English Version 720p", "https://archive.org/download/TheMessageEnglishVersion/The%20Message%20English%20Version.mp4"),
    ("Muhammad: The Messenger of God (2015) 1080p", "https://archive.org/download/Muhammad.The.Messenger.of.God.2015.1080p.Urdu.Hindi.WEBRip.HE-AAC.2.0.x264-Shehnshahr/Muhammad.The.Messenger.of.God.2015.1080p.Urdu.Hindi.WEBRip.HE-AAC.2.0.x264-Shehnshahr.mp4"),
    ("Muhammad: The Last Prophet (2002) 480p", "https://archive.org/download/muhammad-the-last-prophet-2002-azeem/Muhammad%20The%20Last%20Prophet%20%282002%29.mp4"),
    ("The Kingdom of Solomon (2010)", "https://archive.org/download/TheKingdomOfSolomon/The%20Kingdom%20of%20Solomon%20%282010%29.mp4"),
    ("Saint Mary (2000) Ep 1", "https://archive.org/download/saint-mary-series/Saint%20Mary%20Series%20-%20Episode%2001.mp4"),
    ("Bilal: A New Breed of Hero (2015)", "https://archive.org/download/BILAL_2015/Bilal%20A%20New%20Breed%20Of%20Hero%20%282015%29.mp4"),
    ("Omar (2012) Ep 1", "https://archive.org/download/OmarSeriesArabicWithEnglishSubtitles/OmarSeries%20-%20Ep1%20-%20English%20Subtitles.mp4"),
    ("Men of Anjolos (1997) Movie", "https://archive.org/download/the-ashab-e-kahf-men-of-the-cave-movie-urdu-with-english-subtitles/The%20Ashab-e-Kahf%20%28Men%20of%20The%20Cave%29%20Movie%20%E2%80%93%20Urdu%20with%20English%20Subtitles.mp4"),
    ("Men of Anjolos (1997) Ep 1", "https://archive.org/download/ashabekahfurdu/01.mp4"),
    ("Prophet Joseph (2008) Farsi Ep 1", "https://archive.org/download/hazrat-yusuf-a-s/Hazrat%20Yusuf%20%28A.S%29%20Farsi%20Ep01.mp4"),
    ("Prophet Joseph (2008) Urdu Ep 1", "https://archive.org/download/hazrat-yusuf-a-s/Hazrat%20Yusuf%20%28A.S%29%20Urdu%20Ep01.mp4"),
]

for name, u in urls:
    cmd = ["curl.exe", "-g", "-I", "-L", "-s", "-m", "10", u]
    res = subprocess.run(cmd, capture_output=True, text=True)
    out = res.stdout
    has_200 = "HTTP/1.1 200" in out or "HTTP/2 200" in out
    has_mp4 = "video/mp4" in out.lower()
    cl_line = [l for l in out.splitlines() if "content-length:" in l.lower()]
    size = cl_line[-1] if cl_line else "unknown size"
    status = "PASS" if has_200 and has_mp4 else "FAIL"
    print(f"[{status}] {name} -> {size}")
