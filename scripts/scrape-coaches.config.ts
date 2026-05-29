import type { CmsType } from "./parsers/types.js";

export interface SchoolConfig {
  name: string;
  url: string;
  cms: CmsType | "auto";
}

export interface ScraperConfig {
  schools: SchoolConfig[];
  roleFilters: RegExp[];
  requestDelayMs: number;
  maxConcurrent: number;
  userAgent: string;
  respectRobotsTxt: boolean;
  blocklist: string[];
}

export const config: ScraperConfig = {
  schools: [

    // ── D3 — NESCAC ──────────────────────────────────────────────────────────
    { name: "Amherst",           url: "https://amherstmammoth.com/staff-directory",              cms: "auto" },
    { name: "Bates",             url: "https://gobatesbobcats.com/staff-directory",              cms: "auto" },
    { name: "Bowdoin",           url: "https://athletics.bowdoin.edu/staff-directory",           cms: "auto" },
    { name: "Colby",             url: "https://gocolby.com/staff-directory",                     cms: "auto" },
    { name: "Connecticut College", url: "https://athletics.conncoll.edu/staff-directory",       cms: "auto" },
    { name: "Hamilton",          url: "https://athletics.hamilton.edu/staff-directory",          cms: "auto" },
    { name: "Middlebury",        url: "https://middleburyathletics.com/staff-directory",         cms: "auto" },
    { name: "Trinity (CT)",      url: "https://bantams.trincoll.edu/staff-directory",            cms: "auto" },
    { name: "Tufts",             url: "https://gotuftsjumbos.com/staff-directory",               cms: "auto" },
    { name: "Wesleyan",          url: "https://athletics.wesleyan.edu/staff-directory",          cms: "auto" },
    { name: "Williams",          url: "https://ephsports.williams.edu/staff-directory",          cms: "auto" },

    // ── D3 — Ohio Athletic Conference ────────────────────────────────────────
    { name: "Baldwin Wallace",   url: "https://bwyellowjackets.com/staff-directory",             cms: "auto" },
    { name: "Capital",           url: "https://cougars.capital.edu/staff-directory",             cms: "auto" },
    { name: "Heidelberg",        url: "https://heidelbergathletics.com/staff-directory",         cms: "auto" },
    { name: "John Carroll",      url: "https://jcuathletics.com/staff-directory",                cms: "auto" },
    { name: "Marietta",          url: "https://mariettaathletics.com/staff-directory",           cms: "auto" },
    { name: "Mount Union",       url: "https://gounionathletics.com/staff-directory",            cms: "auto" },
    { name: "Muskingum",         url: "https://muskingumathletics.com/staff-directory",          cms: "auto" },
    { name: "Ohio Northern",     url: "https://athletics.onu.edu/staff-directory",               cms: "auto" },
    { name: "Otterbein",         url: "https://otterbeinathletics.com/staff-directory",          cms: "auto" },
    { name: "Wilmington (OH)",   url: "https://wilmingtonathletics.com/staff-directory",         cms: "auto" },
    { name: "Wooster",           url: "https://woosterathletics.com/staff-directory",            cms: "auto" },

    // ── D3 — CCIW ────────────────────────────────────────────────────────────
    { name: "Augustana (IL)",    url: "https://athletics.augustana.edu/staff-directory",         cms: "auto" },
    { name: "Carroll",           url: "https://athletics.carrollu.edu/staff-directory",          cms: "auto" },
    { name: "Elmhurst",          url: "https://elmhurstathletics.com/staff-directory",           cms: "auto" },
    { name: "Illinois Wesleyan", url: "https://iwusycamores.com/staff-directory",                cms: "auto" },
    { name: "Millikin",          url: "https://millikinsports.com/staff-directory",              cms: "auto" },
    { name: "North Central",     url: "https://nccardinalsports.com/staff-directory",            cms: "auto" },
    { name: "North Park",        url: "https://athletics.northpark.edu/staff-directory",         cms: "auto" },
    { name: "Wheaton (IL)",      url: "https://wheatonsports.com/staff-directory",               cms: "auto" },

    // ── D3 — WIAC ────────────────────────────────────────────────────────────
    { name: "UW-Eau Claire",     url: "https://athletics.uwec.edu/staff-directory",              cms: "auto" },
    { name: "UW-La Crosse",      url: "https://uwlathletics.com/staff-directory",                cms: "auto" },
    { name: "UW-Oshkosh",        url: "https://athletics.uwosh.edu/staff-directory",             cms: "auto" },
    { name: "UW-Platteville",    url: "https://athletics.uwplatt.edu/staff-directory",           cms: "auto" },
    { name: "UW-River Falls",    url: "https://athletics.uwrf.edu/staff-directory",              cms: "auto" },
    { name: "UW-Stevens Point",  url: "https://athletics.uwsp.edu/staff-directory",              cms: "auto" },
    { name: "UW-Stout",          url: "https://stoutathletics.com/staff-directory",              cms: "auto" },
    { name: "UW-Whitewater",     url: "https://warhawksports.com/staff-directory",               cms: "auto" },

    // ── D3 — Centennial Conference ───────────────────────────────────────────
    { name: "Dickinson",         url: "https://reddevilsports.com/staff-directory",              cms: "auto" },
    { name: "Franklin & Marshall", url: "https://fandmathletics.com/staff-directory",           cms: "auto" },
    { name: "Gettysburg",        url: "https://gettysburgathletics.com/staff-directory",         cms: "auto" },
    { name: "Johns Hopkins",     url: "https://hopkinsathletics.com/staff-directory",            cms: "auto" },
    { name: "McDaniel",          url: "https://mcdanielathletics.com/staff-directory",           cms: "auto" },
    { name: "Moravian",          url: "https://moravianathletics.com/staff-directory",           cms: "auto" },
    { name: "Muhlenberg",        url: "https://muhlathletics.com/staff-directory",               cms: "auto" },
    { name: "Susquehanna",       url: "https://athletics.susqu.edu/staff-directory",             cms: "auto" },
    { name: "Swarthmore",        url: "https://athletics.swarthmore.edu/staff-directory",        cms: "auto" },
    { name: "Ursinus",           url: "https://ursinus.prestosports.com/staff-directory",        cms: "presto" },

    // ── D3 — Empire 8 ────────────────────────────────────────────────────────
    { name: "Alfred",            url: "https://athletics.alfred.edu/staff-directory",            cms: "auto" },
    { name: "Hartwick",          url: "https://hawkssports.com/staff-directory",                 cms: "auto" },
    { name: "Ithaca",            url: "https://athletics.ithaca.edu/staff-directory",            cms: "auto" },
    { name: "Messiah",           url: "https://falcons.messiah.edu/staff-directory",             cms: "auto" },
    { name: "Morrisville State", url: "https://morrisvilleathletics.com/staff-directory",        cms: "auto" },
    { name: "St. John Fisher",   url: "https://sjfathletics.com/staff-directory",                cms: "auto" },
    { name: "Utica",             url: "https://uticaathletics.com/staff-directory",              cms: "auto" },

    // ── D3 — Liberty League ──────────────────────────────────────────────────
    { name: "Hobart",            url: "https://hwsathletics.com/staff-directory",                cms: "auto" },
    { name: "RPI",               url: "https://athletics.rpi.edu/staff-directory",               cms: "auto" },
    { name: "RIT",               url: "https://ritathletics.com/staff-directory",                cms: "auto" },
    { name: "Rochester",         url: "https://rochesterathletics.com/staff-directory",          cms: "auto" },
    { name: "Skidmore",          url: "https://athletics.skidmore.edu/staff-directory",          cms: "auto" },
    { name: "St. Lawrence",      url: "https://stlawrenceathletics.com/staff-directory",         cms: "auto" },
    { name: "Union (NY)",        url: "https://garnetandgray.com/staff-directory",               cms: "auto" },
    { name: "Vassar",            url: "https://vassarathletics.com/staff-directory",             cms: "auto" },

    // ── D3 — North Coast Athletic Conference ─────────────────────────────────
    { name: "Allegheny",         url: "https://gatorathletics.com/staff-directory",              cms: "auto" },
    { name: "Denison",           url: "https://denisonathletics.com/staff-directory",            cms: "auto" },
    { name: "DePauw",            url: "https://depawathletics.com/staff-directory",              cms: "auto" },
    { name: "Hiram",             url: "https://hiramterriers.com/staff-directory",               cms: "auto" },
    { name: "Kenyon",            url: "https://athletics.kenyon.edu/staff-directory",            cms: "auto" },
    { name: "Oberlin",           url: "https://athletics.oberlin.edu/staff-directory",           cms: "auto" },
    { name: "Ohio Wesleyan",     url: "https://athletics.owu.edu/staff-directory",               cms: "auto" },
    { name: "Wabash",            url: "https://wabashathletics.com/staff-directory",             cms: "auto" },

    // ── D3 — Old Dominion Athletic Conference ────────────────────────────────
    { name: "Bridgewater (VA)",  url: "https://bcathletics.com/staff-directory",                 cms: "auto" },
    { name: "Ferrum",            url: "https://ferrumathletics.com/staff-directory",             cms: "auto" },
    { name: "Hampden-Sydney",    url: "https://hscollegathletics.com/staff-directory",           cms: "auto" },
    { name: "Lynchburg",         url: "https://lynchathletics.com/staff-directory",              cms: "auto" },
    { name: "Randolph-Macon",    url: "https://rmcathletics.com/staff-directory",                cms: "auto" },
    { name: "Shenandoah",        url: "https://suathletics.com/staff-directory",                 cms: "auto" },
    { name: "Washington and Lee", url: "https://generalssports.com/staff-directory",            cms: "auto" },

    // ── D3 — American Rivers Conference ──────────────────────────────────────
    { name: "Buena Vista",       url: "https://gobvbeavers.com/staff-directory",                 cms: "auto" },
    { name: "Central (IA)",      url: "https://athletics.central.edu/staff-directory",           cms: "auto" },
    { name: "Coe",               url: "https://kohawks.com/staff-directory",                     cms: "auto" },
    { name: "Dubuque",           url: "https://dbqathletics.com/staff-directory",                cms: "auto" },
    { name: "Loras",             url: "https://lorasduhawks.com/staff-directory",                cms: "auto" },
    { name: "Luther",            url: "https://norse.luther.edu/staff-directory",                cms: "auto" },
    { name: "Nebraska Wesleyan", url: "https://wnusports.com/staff-directory",                   cms: "auto" },
    { name: "Simpson",           url: "https://simpsonstormathletics.com/staff-directory",       cms: "auto" },
    { name: "Upper Iowa",        url: "https://uiuathletics.com/staff-directory",                cms: "auto" },
    { name: "Wartburg",          url: "https://wartburgathletics.com/staff-directory",           cms: "auto" },

    // ── D3 — Midwest Conference ───────────────────────────────────────────────
    { name: "Beloit",            url: "https://beloitathletics.com/staff-directory",             cms: "auto" },
    { name: "Cornell (IA)",      url: "https://cornathletics.com/staff-directory",               cms: "auto" },
    { name: "Grinnell",          url: "https://athletics.grinnell.edu/staff-directory",          cms: "auto" },
    { name: "Illinois College",  url: "https://athletics.ic.edu/staff-directory",                cms: "auto" },
    { name: "Knox",              url: "https://knoxathletics.com/staff-directory",               cms: "auto" },
    { name: "Lake Forest",       url: "https://lakeforestathletics.com/staff-directory",         cms: "auto" },
    { name: "Lawrence",          url: "https://lawrenceathletics.com/staff-directory",           cms: "auto" },
    { name: "Monmouth (IL)",     url: "https://scottathletics.com/staff-directory",              cms: "auto" },
    { name: "Ripon",             url: "https://riponathletics.com/staff-directory",              cms: "auto" },
    { name: "St. Norbert",       url: "https://snc-greenknight.com/staff-directory",             cms: "auto" },

    // ── D3 — Presidents' Athletic Conference ─────────────────────────────────
    { name: "Bethany (WV)",      url: "https://athleticsbison.com/staff-directory",              cms: "auto" },
    { name: "Carnegie Mellon",   url: "https://athletics.cmu.edu/staff-directory",               cms: "auto" },
    { name: "Case Western Reserve", url: "https://athletics.case.edu/staff-directory",          cms: "auto" },
    { name: "Geneva",            url: "https://athletics.geneva.edu/staff-directory",            cms: "auto" },
    { name: "Grove City",        url: "https://athletics.gcc.edu/staff-directory",               cms: "auto" },
    { name: "Saint Vincent",     url: "https://svbearcat.com/staff-directory",                   cms: "auto" },
    { name: "Thiel",             url: "https://thielsports.com/staff-directory",                 cms: "auto" },
    { name: "Washington & Jefferson", url: "https://wjathletics.com/staff-directory",           cms: "auto" },
    { name: "Waynesburg",        url: "https://waynesburgathletics.com/staff-directory",         cms: "auto" },
    { name: "Westminster (PA)",  url: "https://westminstertitans.com/staff-directory",           cms: "auto" },

    // ── D3 — Southern Athletic Association ───────────────────────────────────
    { name: "Birmingham-Southern", url: "https://bscsports.com/staff-directory",                cms: "auto" },
    { name: "Centre",            url: "https://centreathletics.com/staff-directory",             cms: "auto" },
    { name: "Hendrix",           url: "https://hendrixwarriors.com/staff-directory",             cms: "auto" },
    { name: "Millsaps",          url: "https://millsapsmajors.com/staff-directory",              cms: "auto" },
    { name: "Rhodes",            url: "https://rhodesathletics.com/staff-directory",             cms: "auto" },
    { name: "Sewanee",           url: "https://sewaneeathletics.com/staff-directory",            cms: "auto" },
    { name: "Trinity (TX)",      url: "https://trinitytiger.com/staff-directory",                cms: "auto" },

    // ── D3 — USA South ────────────────────────────────────────────────────────
    { name: "Christopher Newport", url: "https://cnu.prestosports.com/staff-directory",         cms: "presto" },
    { name: "Covenant",          url: "https://covenantsports.com/staff-directory",              cms: "auto" },
    { name: "Emory",             url: "https://athletics.emory.edu/staff-directory",             cms: "auto" },
    { name: "LaGrange",          url: "https://gopanthers.lagrange.edu/staff-directory",         cms: "auto" },
    { name: "Maryville (TN)",    url: "https://maryvilleathletics.com/staff-directory",          cms: "auto" },
    { name: "Methodist",         url: "https://godmme.com/staff-directory",                      cms: "auto" },
    { name: "North Carolina Wesleyan", url: "https://ncwathletics.com/staff-directory",         cms: "auto" },
    { name: "Piedmont",          url: "https://piedmontathletics.com/staff-directory",           cms: "auto" },
    { name: "Rust",              url: "https://rustathletics.com/staff-directory",               cms: "auto" },
    { name: "Shenandoah",        url: "https://suathletics.com/staff-directory",                 cms: "auto" },

    // ── D3 — New England ─────────────────────────────────────────────────────
    { name: "Bridgewater State", url: "https://bsubears.com/staff-directory",                    cms: "auto" },
    { name: "Endicott",          url: "https://endicottathletics.com/staff-directory",           cms: "auto" },
    { name: "Fitchburg State",   url: "https://fscfalcons.com/staff-directory",                  cms: "auto" },
    { name: "Framingham State",  url: "https://fsurams.com/staff-directory",                     cms: "auto" },
    { name: "Massachusetts Maritime", url: "https://athletics.maritime.edu/staff-directory",    cms: "auto" },
    { name: "MIT",               url: "https://mitathletics.com/staff-directory",                cms: "auto" },
    { name: "Plymouth State",    url: "https://athletics.plymouth.edu/staff-directory",          cms: "auto" },
    { name: "Salem State",       url: "https://salemstatevikings.com/staff-directory",           cms: "auto" },
    { name: "Springfield",       url: "https://springfieldathletics.com/staff-directory",        cms: "auto" },
    { name: "Western New England", url: "https://wneathletics.com/staff-directory",             cms: "auto" },
    { name: "Westfield State",   url: "https://westfieldathletics.com/staff-directory",          cms: "auto" },
    { name: "WPI",               url: "https://athletics.wpi.edu/staff-directory",               cms: "auto" },

    // ── D3 — New Jersey Athletic Conference ──────────────────────────────────
    { name: "Kean",              url: "https://keanathletics.com/staff-directory",               cms: "auto" },
    { name: "Montclair State",   url: "https://montclairstateathleics.com/staff-directory",      cms: "auto" },
    { name: "New Jersey City",   url: "https://njcuathletics.com/staff-directory",               cms: "auto" },
    { name: "Ramapo",            url: "https://athletics.ramapo.edu/staff-directory",            cms: "auto" },
    { name: "Rowan",             url: "https://rownathletics.com/staff-directory",               cms: "auto" },
    { name: "Rutgers-Camden",    url: "https://athletics.camden.rutgers.edu/staff-directory",    cms: "auto" },
    { name: "Stockton",          url: "https://stocktonathletics.com/staff-directory",           cms: "auto" },
    { name: "William Paterson",  url: "https://athletics.wpunj.edu/staff-directory",             cms: "auto" },

    // ── D3 — Landmark Conference ──────────────────────────────────────────────
    { name: "Catholic",          url: "https://catholickardinals.com/staff-directory",           cms: "auto" },
    { name: "Drew",              url: "https://drewathletics.com/staff-directory",               cms: "auto" },
    { name: "Elizabethtown",     url: "https://bluejayathletics.com/staff-directory",            cms: "auto" },
    { name: "Goucher",           url: "https://goucherathletics.com/staff-directory",            cms: "auto" },
    { name: "Juniata",           url: "https://athletics.juniata.edu/staff-directory",           cms: "auto" },
    { name: "Stevenson",         url: "https://stevensonathletics.com/staff-directory",          cms: "auto" },

    // ── D3 — Northwest Conference ─────────────────────────────────────────────
    { name: "George Fox",        url: "https://gfuathletics.com/staff-directory",                cms: "auto" },
    { name: "Lewis & Clark",     url: "https://athletics.lclark.edu/staff-directory",            cms: "auto" },
    { name: "Linfield",          url: "https://linfield.prestosports.com/staff-directory",       cms: "presto" },
    { name: "Pacific Lutheran",  url: "https://pluathletics.com/staff-directory",                cms: "auto" },
    { name: "Pacific (OR)",      url: "https://goboxers.com/staff-directory",                    cms: "auto" },
    { name: "Puget Sound",       url: "https://athletics.pugetsound.edu/staff-directory",        cms: "auto" },
    { name: "Whitworth",         url: "https://whitworthathletics.com/staff-directory",          cms: "auto" },
    { name: "Willamette",        url: "https://gobearcats.com/staff-directory",                  cms: "auto" },

    // ── D3 — MIAC ─────────────────────────────────────────────────────────────
    { name: "Augsburg",          url: "https://augsburgathletics.com/staff-directory",           cms: "auto" },
    { name: "Bethel (MN)",       url: "https://royalsathletics.com/staff-directory",             cms: "auto" },
    { name: "Carleton",          url: "https://athletics.carleton.edu/staff-directory",          cms: "auto" },
    { name: "Concordia (MN)",    url: "https://cobberathletics.com/staff-directory",             cms: "auto" },
    { name: "Gustavus Adolphus", url: "https://gustavusathletics.com/staff-directory",           cms: "auto" },
    { name: "Hamline",           url: "https://hamlineathletics.com/staff-directory",            cms: "auto" },
    { name: "Macalester",        url: "https://athletics.macalester.edu/staff-directory",        cms: "auto" },
    { name: "St. John's (MN)",   url: "https://johnniesathletics.com/staff-directory",          cms: "auto" },
    { name: "St. Olaf",          url: "https://stolafathletics.com/staff-directory",             cms: "auto" },
    { name: "St. Thomas (MN)",   url: "https://tommiesathletics.com/staff-directory",            cms: "auto" },

    // ── D3 — Heartland Collegiate ─────────────────────────────────────────────
    { name: "Anderson (IN)",     url: "https://andersonravens.com/staff-directory",              cms: "auto" },
    { name: "Bluffton",          url: "https://blufftonathletics.com/staff-directory",           cms: "auto" },
    { name: "Defiance",          url: "https://defianceathletics.com/staff-directory",           cms: "auto" },
    { name: "Earlham",           url: "https://athletics.earlham.edu/staff-directory",           cms: "auto" },
    { name: "Hanover",           url: "https://hanoverathletics.com/staff-directory",            cms: "auto" },
    { name: "Manchester",        url: "https://manchesterathletics.com/staff-directory",         cms: "auto" },
    { name: "Mount St. Joseph",  url: "https://msj.prestosports.com/staff-directory",            cms: "presto" },
    { name: "Rose-Hulman",       url: "https://athletics.rose-hulman.edu/staff-directory",       cms: "auto" },

    // ── D3 — ASC ──────────────────────────────────────────────────────────────
    { name: "Belhaven",          url: "https://blazers.belhaven.edu/staff-directory",            cms: "auto" },
    { name: "East Texas Baptist", url: "https://etbuathletics.com/staff-directory",             cms: "auto" },
    { name: "Hardin-Simmons",    url: "https://hsucowboys.com/staff-directory",                  cms: "auto" },
    { name: "Howard Payne",      url: "https://hpuathletics.com/staff-directory",                cms: "auto" },
    { name: "Louisiana College", url: "https://lcsports.com/staff-directory",                    cms: "auto" },
    { name: "Mary Hardin-Baylor", url: "https://umhbsports.com/staff-directory",                cms: "auto" },
    { name: "McMurry",           url: "https://mcmurryathletics.com/staff-directory",            cms: "auto" },
    { name: "Sul Ross State",    url: "https://athletics.sulross.edu/staff-directory",           cms: "auto" },
    { name: "Texas Lutheran",    url: "https://tluathletics.com/staff-directory",                cms: "auto" },

    // ── D2 (active recruiters, smaller budgets) ───────────────────────────────
    { name: "Grand Valley State",    url: "https://gvsulakers.com/staff-directory",              cms: "auto" },
    { name: "Ferris State",          url: "https://ferrisstatebulldogs.com/staff-directory",     cms: "auto" },
    { name: "Valdosta State",        url: "https://blazersports.com/staff-directory",            cms: "auto" },
    { name: "Northwest Missouri State", url: "https://bearcatsports.com/staff-directory",       cms: "auto" },
    { name: "Pittsburg State",       url: "https://gorillasathletics.com/staff-directory",       cms: "auto" },
    { name: "West Florida",          url: "https://goargonauts.com/staff-directory",             cms: "auto" },
    { name: "Tarleton State",        url: "https://tarletonsports.com/staff-directory",          cms: "auto" },
    { name: "Colorado School of Mines", url: "https://orediggerathletics.com/staff-directory",  cms: "auto" },
    { name: "Henderson State",       url: "https://hendersonreddies.com/staff-directory",        cms: "auto" },
    { name: "Texas A&M Commerce",    url: "https://goamlions.com/staff-directory",               cms: "auto" },
    { name: "Augustana (SD)",        url: "https://augustanaviking.com/staff-directory",         cms: "auto" },
    { name: "Bemidji State",         url: "https://gobeavers.com/staff-directory",               cms: "auto" },
    { name: "Findlay",               url: "https://athletics.findlay.edu/staff-directory",       cms: "auto" },
    { name: "Hillsdale",             url: "https://hillsdalesports.com/staff-directory",          cms: "auto" },
    { name: "Indianapolis",          url: "https://uindy.prestosports.com/staff-directory",      cms: "presto" },
    { name: "Lake Erie",             url: "https://athletics.lec.edu/staff-directory",           cms: "auto" },
    { name: "Northwood",             url: "https://northwoodathletics.com/staff-directory",      cms: "auto" },
    { name: "Saginaw Valley State",  url: "https://svsucardinals.com/staff-directory",           cms: "auto" },
    { name: "Tiffin",                url: "https://tiffindragonathletics.com/staff-directory",   cms: "auto" },
    { name: "Wayne State (MI)",      url: "https://wsuvikings.com/staff-directory",              cms: "auto" },

    // ── FCS (strong recruiting need, less tech budget than P5) ───────────────
    { name: "North Dakota State", url: "https://gobison.com/staff-directory",                    cms: "auto" },
    { name: "South Dakota State", url: "https://gojacks.com/staff-directory",                    cms: "auto" },
    { name: "James Madison",      url: "https://jmusports.com/staff-directory",                  cms: "auto" },
    { name: "Montana",            url: "https://montanagrizzlies.com/staff-directory",           cms: "auto" },
    { name: "Sam Houston",        url: "https://gobearkats.com/staff-directory",                 cms: "auto" },
    { name: "Delaware",           url: "https://bluehens.com/staff-directory",                   cms: "auto" },
    { name: "Villanova",          url: "https://villanova.com/sports/football/coaches",          cms: "auto" },
    { name: "Weber State",        url: "https://weberstatesports.com/staff-directory",           cms: "auto" },
    { name: "Sacramento State",   url: "https://hornetsports.com/staff-directory",               cms: "auto" },
    { name: "Southern Illinois",  url: "https://siusalukis.com/staff-directory",                 cms: "auto" },
    { name: "Youngstown State",   url: "https://ysusports.com/staff-directory",                  cms: "auto" },
    { name: "Eastern Washington", url: "https://ewueagles.com/staff-directory",                  cms: "auto" },
    { name: "UC Davis",           url: "https://ucdavisaggies.com/staff-directory",              cms: "auto" },
    { name: "Stony Brook",        url: "https://goseawolves.com/staff-directory",                cms: "auto" },
    { name: "Maine",              url: "https://goblackbears.com/staff-directory",               cms: "auto" },
    { name: "New Hampshire",      url: "https://unhwildcats.com/staff-directory",                cms: "auto" },
    { name: "Rhode Island",       url: "https://gorhody.com/staff-directory",                    cms: "auto" },
    { name: "Elon",               url: "https://elonphoenix.com/staff-directory",                cms: "auto" },
    { name: "Furman",             url: "https://furmanpaladins.com/staff-directory",             cms: "auto" },
    { name: "Wofford",            url: "https://woffordterriers.com/staff-directory",            cms: "auto" },
    { name: "Chattanooga",        url: "https://gomocs.com/staff-directory",                     cms: "auto" },
    { name: "Mercer",             url: "https://mercerbears.com/staff-directory",                cms: "auto" },
    { name: "Western Carolina",   url: "https://catamountathletics.com/staff-directory",         cms: "auto" },
    { name: "Kennesaw State",     url: "https://ksuowls.com/staff-directory",                    cms: "auto" },
    { name: "Campbell",           url: "https://campbellsports.com/staff-directory",             cms: "auto" },
    { name: "Gardner-Webb",       url: "https://gwusports.com/staff-directory",                  cms: "auto" },
    { name: "Monmouth",           url: "https://monmouthhawks.com/staff-directory",              cms: "auto" },
    { name: "Sacred Heart",       url: "https://sacredheartpioneers.com/staff-directory",        cms: "auto" },
    { name: "Central Connecticut", url: "https://ccsuathletics.com/staff-directory",            cms: "auto" },
    { name: "Albany",             url: "https://ualbanyathletics.com/staff-directory",           cms: "auto" },
    { name: "Duquesne",           url: "https://goduquesne.com/staff-directory",                 cms: "auto" },
    { name: "Drake",              url: "https://godrakebulldogs.com/staff-directory",            cms: "auto" },
    { name: "Illinois State",     url: "https://goredbirds.com/staff-directory",                 cms: "auto" },
    { name: "Missouri State",     url: "https://missouristatebears.com/staff-directory",         cms: "auto" },
    { name: "North Dakota",       url: "https://undsports.com/staff-directory",                  cms: "auto" },
    { name: "South Dakota",       url: "https://goyotes.com/staff-directory",                    cms: "auto" },
    { name: "Southern Utah",      url: "https://suutbirds.com/staff-directory",                  cms: "auto" },
    { name: "Western Illinois",   url: "https://leathernecks.com/staff-directory",               cms: "auto" },
  ],

  // Broad filters — D3/D2 coaches don't always have "recruiting" in their title
  // They all recruit, so we want every coaching role
  roleFilters: [
    /head coach/i,
    /assistant.*coach/i,
    /coach/i,
    /coordinator/i,
    /director.*player personnel/i,
    /director.*recruiting/i,
    /recruiting/i,
    /director.*operations/i,
  ],

  requestDelayMs: 2500,
  maxConcurrent: 1,
  userAgent:
    "SpotrBot/0.1 (+https://thespotrapp.com/bot — outreach contact: evan@thespotrapp.com)",
  respectRobotsTxt: true,

  // Add domain hostnames here if a site owner asks us to stop
  blocklist: [],
};
