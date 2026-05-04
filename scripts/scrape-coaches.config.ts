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
  // Schools explicitly opted out — add any site that asks to be removed
  blocklist: string[];
}

export const config: ScraperConfig = {
  schools: [
    // ── SEC ──────────────────────────────────────────────────────────────────
    { name: "Georgia",        url: "https://georgiadogs.com/sports/football/coaches",       cms: "auto" },
    { name: "Alabama",        url: "https://rolltide.com/sports/football/coaches",          cms: "auto" },
    { name: "Florida State",  url: "https://seminoles.com/staff-directory?category=football", cms: "auto" },
    { name: "Tennessee",      url: "https://utsports.com/sports/football/coaches",          cms: "auto" },
    { name: "LSU",            url: "https://lsusports.net/staff-directory?category=football", cms: "generic" },
    { name: "Auburn",         url: "https://auburntigers.com/staff-directory?category=football", cms: "auto" },
    { name: "Texas A&M",      url: "https://12thman.com/sports/football/coaches",           cms: "auto" },
    { name: "Arkansas",       url: "https://arkansasrazorbacks.com/staff-directory?category=football", cms: "auto" },
    { name: "Ole Miss",       url: "https://olemisssports.com/sports/football/coaches",     cms: "auto" },
    { name: "Mississippi State", url: "https://hailstate.com/sports/football/coaches",     cms: "auto" },
    { name: "South Carolina", url: "https://gamecocksonline.com/staff-directory?category=football", cms: "generic" },
    { name: "Kentucky",       url: "https://ukathletics.com/staff-directory?category=football", cms: "generic" },
    { name: "Missouri",       url: "https://mutigers.com/sports/football/coaches",          cms: "auto" },
    { name: "Vanderbilt",     url: "https://vucommodores.com/staff-directory?category=football", cms: "generic" },
    { name: "Texas",          url: "https://texassports.com/sports/football/coaches",       cms: "auto" },
    { name: "Oklahoma",       url: "https://soonersports.com/sports/football/coaches",      cms: "auto" },

    // ── Big Ten ───────────────────────────────────────────────────────────────
    { name: "Ohio State",     url: "https://ohiostatebuckeyes.com/sports/football/coaches", cms: "auto" },
    { name: "Michigan",       url: "https://mgoblue.com/sports/football/coaches",           cms: "auto" },
    { name: "Penn State",     url: "https://gopsusports.com/staff-directory?category=football",   cms: "auto" },
    { name: "Michigan State", url: "https://msuspartans.com/sports/football/coaches",       cms: "auto" },
    { name: "Wisconsin",      url: "https://uwbadgers.com/sports/football/coaches",         cms: "auto" },
    { name: "Iowa",           url: "https://hawkeyesports.com/staff-directory?category=football", cms: "auto" },
    { name: "Nebraska",       url: "https://huskers.com/staff-directory?category=football", cms: "auto" },
    { name: "Minnesota",      url: "https://gophersports.com/sports/football/coaches",      cms: "auto" },
    { name: "Illinois",       url: "https://fightingillini.com/sports/football/coaches",    cms: "auto" },
    { name: "Purdue",         url: "https://purduesports.com/staff-directory?category=football", cms: "auto" },
    { name: "Indiana",        url: "https://iuhoosiers.com/sports/football/coaches",        cms: "auto" },
    { name: "Rutgers",        url: "https://scarletknights.com/sports/football/coaches",    cms: "auto" },
    { name: "Maryland",       url: "https://umterps.com/sports/football/coaches",           cms: "auto" },
    { name: "Northwestern",   url: "https://nusports.com/sports/football/coaches",          cms: "auto" },
    { name: "Oregon",         url: "https://goducks.com/sports/football/coaches",           cms: "auto" },
    { name: "USC",            url: "https://usctrojans.com/sports/football/coaches",        cms: "auto" },
    { name: "UCLA",           url: "https://uclabruins.com/sports/football/coaches",        cms: "auto" },
    { name: "Washington",     url: "https://gohuskies.com/sports/football/coaches",         cms: "auto" },

    // ── Big 12 ────────────────────────────────────────────────────────────────
    { name: "Baylor",         url: "https://baylorbears.com/sports/football/staff",         cms: "auto" },
    { name: "TCU",            url: "https://gofrogs.com/sports/football/coaches",           cms: "auto" },
    { name: "Kansas State",   url: "https://kstatesports.com/sports/football/coaches",      cms: "auto" },
    { name: "Oklahoma State", url: "https://okstate.com/sports/football/coaches",           cms: "auto" },
    { name: "West Virginia",  url: "https://wvusports.com/sports/football/coaches",         cms: "auto" },
    { name: "Iowa State",     url: "https://cyclones.com/sports/football/coaches",          cms: "auto" },
    { name: "Texas Tech",     url: "https://texastech.com/sports/football/coaches",         cms: "auto" },
    { name: "Kansas",         url: "https://kuathletics.com/sports/football/coaches",       cms: "auto" },
    { name: "BYU",            url: "https://byucougars.com/staff-directory?category=football", cms: "auto" },
    { name: "UCF",            url: "https://ucfknights.com/staff-directory?category=football", cms: "auto" },
    { name: "Houston",        url: "https://uhcougars.com/sports/football/coaches",         cms: "auto" },
    { name: "Arizona State",  url: "https://thesundevils.com/sports/football/roster",       cms: "auto" },
    { name: "Arizona",        url: "https://arizonawildcats.com/sports/football/coaches",   cms: "auto" },
    { name: "Colorado",       url: "https://cubuffs.com/sports/football/coaches",           cms: "auto" },
    { name: "Utah",           url: "https://utahutes.com/sports/football/coaches",          cms: "auto" },

    // ── ACC ───────────────────────────────────────────────────────────────────
    { name: "Clemson",        url: "https://clemsontigers.com/staff-directory?category=football", cms: "auto" },
    { name: "Miami",          url: "https://hurricanesports.com/sports/football/coaches",   cms: "auto" },
    { name: "North Carolina", url: "https://goheels.com/sports/football/coaches",           cms: "auto" },
    { name: "NC State",       url: "https://gopack.com/sports/football/coaches",            cms: "auto" },
    { name: "Virginia Tech",  url: "https://hokiesports.com/staff-directory?category=football", cms: "auto" },
    { name: "Virginia",       url: "https://virginiasports.com/staff-directory?category=football", cms: "auto" },
    { name: "Louisville",     url: "https://gocards.com/sports/football/coaches",           cms: "auto" },
    { name: "Pittsburgh",     url: "https://pittsburghpanthers.com/sports/football/coaches", cms: "auto" },
    { name: "Georgia Tech",   url: "https://ramblinwreck.com/staff-directory?category=football", cms: "auto" },
    { name: "Syracuse",       url: "https://cuse.com/sports/football/coaches",              cms: "auto" },
    { name: "Duke",           url: "https://goduke.com/sports/football/coaches",            cms: "auto" },
    { name: "Wake Forest",    url: "https://wakeforestsports.com/sports/football/coaches",  cms: "auto" },
    { name: "Notre Dame",     url: "https://und.com/sports/football/coaches",               cms: "auto" },

    // ── FCS ───────────────────────────────────────────────────────────────────
    { name: "North Dakota State", url: "https://gobison.com/sports/football/coaches",       cms: "auto" },
    { name: "South Dakota State", url: "https://gojacks.com/sports/football/coaches",       cms: "auto" },
    { name: "James Madison",  url: "https://jmusports.com/sports/football/coaches",         cms: "auto" },
    { name: "Montana",        url: "https://montanagrizzlies.com/sports/football/coaches",  cms: "auto" },
    { name: "Sam Houston",    url: "https://gobearkats.com/sports/football/coaches",        cms: "auto" },
    { name: "Delaware",       url: "https://bluehens.com/sports/football/coaches",          cms: "auto" },
    { name: "Villanova",      url: "https://villanova.com/sports/football/coaches",         cms: "auto" },
    { name: "Weber State",    url: "https://weberstatesports.com/sports/football/coaches",  cms: "auto" },
    { name: "Sacramento State", url: "https://hornetsports.com/sports/football/coaches",   cms: "auto" },
    { name: "Southern Illinois", url: "https://siusalukis.com/sports/football/coaches",    cms: "auto" },

    // ── D2 ────────────────────────────────────────────────────────────────────
    { name: "Grand Valley State",    url: "https://gvsulakers.com/sports/football/coaches",         cms: "auto" },
    { name: "Ferris State",          url: "https://ferrisstatebulldogs.com/sports/football/coaches", cms: "auto" },
    { name: "Valdosta State",        url: "https://blazersports.com/sports/football/coaches",        cms: "auto" },
    { name: "Colorado School of Mines", url: "https://orediggerathletics.com/sports/football/coaches", cms: "auto" },
    { name: "Henderson State",       url: "https://hendersonreddies.com/sports/football/coaches",    cms: "auto" },
    { name: "Northwest Missouri State", url: "https://bearcatsports.com/sports/football/coaches",   cms: "auto" },
    { name: "Texas A&M Commerce",    url: "https://goamlions.com/sports/football/coaches",           cms: "auto" },
    { name: "Pittsburg State",       url: "https://gorillasathletics.com/sports/football/coaches",   cms: "auto" },
    { name: "Tarleton State",        url: "https://tarletonsports.com/sports/football/coaches",      cms: "auto" },
    { name: "West Florida",          url: "https://goargonauts.com/sports/football/coaches",         cms: "auto" },

    // ── D3 ────────────────────────────────────────────────────────────────────
    { name: "Mount Union",           url: "https://athletics.mountunion.edu/sports/football/coaches", cms: "auto" },
    { name: "Wisconsin-Whitewater",  url: "https://warhawksports.com/sports/football/coaches",        cms: "auto" },
    { name: "Mary Hardin-Baylor",    url: "https://umhbsports.com/sports/football/coaches",           cms: "auto" },
    { name: "Linfield",              url: "https://linfield.prestosports.com/sports/football/coaches", cms: "presto" },
    { name: "Wartburg",              url: "https://wartburgathletics.com/sports/football/coaches",    cms: "auto" },
    { name: "Hardin-Simmons",        url: "https://hsucowboys.com/sports/football/coaches",           cms: "auto" },
    { name: "St. Thomas",            url: "https://tommiesports.com/sports/football/coaches",         cms: "auto" },
    { name: "North Central",         url: "https://nccardinalsports.com/sports/football/coaches",     cms: "auto" },
  ],

  roleFilters: [
    /head coach/i,
    /recruiting coordinator/i,
    /director of player personnel/i,
    /on.?campus recruiting/i,
    /director of recruiting/i,
    /assistant.*coach/i,
    /position coach/i,
    /offensive coordinator/i,
    /defensive coordinator/i,
    /special teams coordinator/i,
  ],

  requestDelayMs: 3000,
  maxConcurrent: 1,
  userAgent:
    "SpotrBot/0.1 (+https://thespotrapp.com/bot — outreach contact: evan@thespotrapp.com)",
  respectRobotsTxt: true,

  // Add domain hostnames here if a site owner asks us to stop
  blocklist: [],
};
