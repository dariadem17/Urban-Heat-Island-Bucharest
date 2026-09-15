"""Short, conditional interpretations for real-estate project screening."""


def _share(entries, category_id):
    return next((entry["percentage"] for entry in entries if entry["categoryId"] == category_id), None)


def apply_guidance(facts):
    """Attach one diagnosis and at most three actions without claiming causality."""
    thermal = facts["thermal"]
    vegetation = facts["vegetation"]
    cover = facts["landCover"]
    area = facts["area"]["name"]
    year = facts["year"]
    if year < 2025:
        facts["projectSummary"] = f"{year} este un reper istoric; compara-l cu 2025 pentru o decizie de proiect actuala."
        facts["intervention"]["priority"] = "historical"
        facts["intervention"]["recommendations"] = []
        facts["intervention"]["basis"] = "Valorile istorice sunt pentru analiza evolutiei, nu pentru recomandari de construire in trecut."
        return facts
    city = facts["area"]["code"] == "bucharest"
    hot = thermal["hotspotAreaPct"]
    city_hot = thermal.get("cityHotspotAreaPct")
    built = facts["builtPressure"]["builtPct"]
    city_built = facts["builtPressure"].get("cityBuiltPct")
    trees = _share(cover["entries"], "trees") if cover["available"] else None
    low_green = vegetation["deltaVsCity"] is not None and vegetation["deltaVsCity"] < -0.01
    high_hot = hot is not None and city_hot is not None and hot >= city_hot + 3
    dense = built is not None and city_built is not None and built >= city_built + 5

    if not thermal["available"] or not vegetation["available"]:
        summary = f"Pentru {area} in {year} lipsesc datele necesare pentru a lega temperatura de vegetatie."
        actions = ["Nu lua o decizie de proiect din acest raport pana nu sunt completate datele lipsa."]
        priority = "insufficient data"
    elif city:
        candidates = facts["benchmark"]["prioritySectors"]
        if candidates:
            names = " si ".join(f"Sectorul {item['sector']}" for item in candidates)
            summary = (f"Pentru alegerea unui amplasament, incepe cu {names}: au LST peste media orasului si NDVI sub medie. "
                       "Acolo merita verificat daca suprafetele construite si zonele foarte calde se suprapun local.")
        else:
            summary = "Bucuresti este reperul comparatiei. Alege un sector pentru a vedea unde se aduna caldura, vegetatia putina si suprafetele construite."
        actions = [
            "Compara sectoarele inainte de selectarea terenului; cauta zonele foarte calde si vegetatia existenta pe harta.",
            "Pentru un proiect nou, rezerva spatiu pentru arbori, sol permeabil si trasee pietonale umbrite inca din concept.",
        ]
        priority = "compare sectors"
    else:
        heat_context = (f"{hot:.1f}% din pixelii analizati sunt foarte calzi, fata de {city_hot:.1f}% in Bucuresti"
                        if hot is not None and city_hot is not None else "Ponderea zonelor foarte calde nu poate fi comparata cu orasul")
        cover_context = (f"; suprafetele construite ocupa {built:.1f}%" if built is not None else
                         "; nu avem clasificare a suprafetelor construite pentru acest an")
        if trees is not None:
            cover_context += f", arborii {trees:.1f}%"
        green_context = ("NDVI este sub media orasului" if low_green else
                         "NDVI nu este sub media orasului")
        if high_hot and dense and low_green:
            summary = (f"{area}: {heat_context}{cover_context}, {green_context}. "
                       "Caldura, acoperirea construita si vegetatia redusa indica o zona care cere masuri clare de racire in proiect.")
            actions = [
                "Evita parcari descoperite si platforme asfaltate ample; pastreaza loc pentru arbori si sol permeabil.",
                "Daca parcela are putin loc la sol, evalueaza un acoperis verde numai dupa verificarea structurii; umbrirea pietonala ramane prioritara.",
                "Verifica pe parcela unde sunt hotspoturile si arborii existenti inainte de a stabili amplasarea si densitatea cladirilor.",
            ]
        elif high_hot:
            summary = (f"{area}: {heat_context}{cover_context}, {green_context}. "
                       "Hotspoturile cer atentie chiar daca ceilalti indicatori nu arata aceeasi presiune peste tot.")
            actions = [
                "Identifica pe harta suprafetele cele mai calde si verifica la fata locului pavajul, acoperisurile si lipsa umbrei.",
                "Proiecteaza umbra, vegetatie si suprafete permeabile acolo unde verificarea amplasamentului confirma problema.",
            ]
        elif dense and low_green:
            summary = (f"{area}: {heat_context}{cover_context}, {green_context}. "
                       "Zona este deja intens construita, dar ponderea hotspoturilor nu depaseste clar media orasului.")
            actions = [
                "Nu extinde inutil suprafetele impermeabile; pastreaza arborii si spatiile verzi existente pe parcela.",
                "Acolo unde nu ramane teren liber, studiaza un acoperis verde daca structura permite si umbrirea traseelor pietonale.",
            ]
        else:
            summary = (f"{area}: {heat_context}{cover_context}, {green_context}. "
                       "Datele nu indica aceeasi combinatie de risc termic si deficit de vegetatie ca in sectoarele prioritare.")
            actions = [
                "Pastreaza arborii maturi si grupeaza noua constructie astfel incat spatiul verde ramas sa fie continuu si utilizabil.",
                "Evita parcarea exclusiv la suprafata; rezerva loc pentru sol permeabil si trasee pietonale umbrite.",
            ]
        priority = "focused review" if high_hot or (dense and low_green) else "routine review"

    facts["projectSummary"] = summary
    facts["intervention"]["priority"] = priority
    facts["intervention"]["recommendations"] = actions
    facts["intervention"]["basis"] = "Comparatie orientativa intre indicatorii disponibili la nivelul zonei."
    return facts


def _temporal_signal(history, area_code):
    recent = [row for row in history if row["year"] in (2020, 2023, 2025)]
    if len(recent) < 3 or any(row["lst"] is None or row["ndvi"] is None for row in recent):
        return "Nu sunt suficiente observatii recente pentru a evalua un tipar repetat."
    if area_code == "bucharest":
        values = [row["ndvi"] for row in recent]
        if values[0] > values[1] > values[2]:
            return (f"NDVI mediu a scazut in cele trei observatii recente: {values[0]:.3f} (2020), "
                    f"{values[1]:.3f} (2023), {values[2]:.3f} (2025). LST nu urmeaza acelasi trend; "
                    "prioritizeaza monitorizarea vegetatiei, nu o prognoza numerica a caldurii.")
        return "NDVI si LST nu arata o directie constanta in cele trei observatii recente; nu extrapola o singura valoare."
    if all(row["lstVsCity"] is not None and row["lstVsCity"] >= 0.3 and
           row["ndviVsCity"] is not None and row["ndviVsCity"] <= -0.01 for row in recent):
        return ("In 2020, 2023 si 2025, sectorul a ramas mai cald decat orasul si cu NDVI mai mic. "
                "Daca acest profil persista, proiectele actuale ar trebui sa planifice din start umbra si vegetatie.")
    if all(row["lstVsCity"] is not None and row["lstVsCity"] <= -0.3 and
           row["ndviVsCity"] is not None and row["ndviVsCity"] >= 0.01 for row in recent):
        return ("In 2020, 2023 si 2025, sectorul a ramas mai racoros si cu NDVI mai mare decat orasul. "
                "Pentru proiectele actuale, protejeaza vegetatia care sustine acest avantaj relativ.")
    return ("Pozitia sectorului fata de oras nu a fost constanta in 2020, 2023 si 2025. "
            "Pentru proiectele actuale, foloseste harta recenta si verifica terenul, fara extrapolare numerica.")


def report_for(facts, history=None):
    if history and facts["year"] < history[-1]["year"]:
        selected = next((row for row in history if row["year"] == facts["year"]), None)
        latest = history[-1]
        if selected and selected["lst"] is not None and selected["ndvi"] is not None and latest["lst"] is not None and latest["ndvi"] is not None:
            lst_change = latest["lst"] - selected["lst"]
            ndvi_change = latest["ndvi"] - selected["ndvi"]
            summary = (f"{facts['year']} este un reper istoric. In 2025, LST mediu este {latest['lst']:.2f} °C "
                       f"fata de {selected['lst']:.2f} °C atunci ({lst_change:+.2f} °C), iar NDVI mediu "
                       f"este {latest['ndvi']:.3f} fata de {selected['ndvi']:.3f} ({ndvi_change:+.3f}).")
        else:
            summary = f"{facts['year']} este un reper istoric; nu avem toate valorile pentru o comparatie cu 2025."
        if selected and selected["builtPct"] is not None and latest["builtPct"] is not None:
            cover_change = latest["builtPct"] - selected["builtPct"]
            historical_cover_label = (f"reperul Land Cover asociat selectiei {facts['year']}"
                                      if facts["landCover"].get("sourceYear") != facts["year"]
                                      else str(facts["year"]))
            summary += (f" Suprafetele construite sunt {latest['builtPct']:.1f}% in 2025 "
                        f"fata de {selected['builtPct']:.1f}% in {historical_cover_label} "
                        f"({cover_change:+.1f} puncte procentuale).")
        signal = _temporal_signal(history, facts["area"]["code"])
        historical_facts = {**facts, "intervention": {**facts["intervention"],
                            "priority": "historical", "recommendations": [signal]}}
        return {
            "title": f"{facts['area']['name']} - {facts['year']}",
            "mode": "historical",
            "summary": summary,
            "sections": [{"title": "Ce ramane relevant azi", "body": signal}],
            "dataNote": ("Comparatia foloseste observatii din veri diferite; diferenta LST nu dovedeste efectul construirii. "
                         + ("Land Cover nu este disponibil pentru acest an. " if not facts["landCover"]["available"] else "")
                         + ("Land Cover foloseste cea mai apropiata clasificare disponibila. "
                            if facts["landCover"]["available"] and facts["landCover"].get("sourceYear") != facts["year"] else "")
                         + "Nu este o prognoza a temperaturii sau a poluarii."),
            "assessment": historical_facts,
        }
    cover = facts["landCover"]
    period_note = ("Land cover: clasificare anuala separata." if cover["available"] else
                   "Fara land cover in acest an; NDVI nu identifica direct cladiri sau apa.")
    note = ("Date la nivel de oras sau sector, nu de parcela. LST si NDVI descriu suprafata vara. "
            + period_note + " Raportul nu estimeaza poluarea sau efectul unui viitor proiect.")
    return {
        "title": f"{facts['area']['name']} - {facts['year']}",
        "mode": "current",
        "summary": facts["projectSummary"],
        "temporalSignal": _temporal_signal(history, facts["area"]["code"]) if history else None,
        "timeline": history or [],
        "sections": [{"title": "Recomandari pentru proiect", "body": " ".join(facts["intervention"]["recommendations"])}],
        "dataNote": note,
        "assessment": facts,
    }


def _year_comparison_guidance(primary, secondary, primary_cover, secondary_cover, history):
    if primary["year"] <= secondary["year"]:
        earlier, later = primary, secondary
        earlier_cover, later_cover = primary_cover, secondary_cover
    else:
        earlier, later = secondary, primary
        earlier_cover, later_cover = secondary_cover, primary_cover
    area = "Bucuresti" if earlier["sectorId"] == "all" else f"Sectorul {earlier['sectorId']}"
    if any(item["avgLst"] is None or item["avgNdvi"] is None for item in (earlier, later)):
        diagnosis = "Lipsesc date LST sau NDVI pentru unul dintre ani; evolutia nu poate fi descrisa complet."
    else:
        lst_change = later["avgLst"] - earlier["avgLst"]
        ndvi_change = later["avgNdvi"] - earlier["avgNdvi"]
        diagnosis = (f"In {area}, din {earlier['year']} pana in {later['year']}, LST mediu a fost "
                     f"{earlier['avgLst']:.2f} -> {later['avgLst']:.2f} °C ({lst_change:+.2f} °C), "
                     f"iar NDVI mediu {earlier['avgNdvi']:.3f} -> {later['avgNdvi']:.3f} ({ndvi_change:+.3f}).")
    built_earlier, built_later = _share(earlier_cover, "built-up"), _share(later_cover, "built-up")
    if built_earlier is not None and built_later is not None:
        diagnosis += (f" Land Cover: suprafete construite {built_earlier:.1f}% -> {built_later:.1f}% "
                      f"({built_later - built_earlier:+.1f} puncte procentuale).")
    elif not earlier_cover or not later_cover:
        diagnosis += " Land Cover nu este disponibil pentru ambii ani."
    signal = _temporal_signal(history or [], "bucharest" if earlier["sectorId"] == "all" else f"sector_{earlier['sectorId']}")
    latest = history[-1] if history else None
    if latest and latest["builtPct"] is not None and latest["builtPct"] >= 70 and (latest["treesPct"] or 0) < 8:
        action = (f"{signal} In 2025, {latest['builtPct']:.1f}% din {area} este clasificat construit. "
                  "Pe parcelele cu putin spatiu liber, verifica fezabilitatea acoperisului verde si pastreaza arborii existenti.")
    else:
        action = signal
    return [
        {"title": "Evolutia observata", "body": diagnosis},
        {"title": "Semnal pentru proiectele actuale", "body": action},
    ], ("Observatii din veri diferite: diferenta LST poate reflecta si conditiile vremii. "
        "Tiparul relativ fata de oras nu este o prognoza si nu estimeaza poluarea.")


def comparison_guidance(kind, primary, secondary, primary_cover, secondary_cover, history=None):
    """Explain measured differences and connect them to conditional design choices."""
    if kind == "year":
        return _year_comparison_guidance(primary, secondary, primary_cover, secondary_cover, history)
    lst_a, lst_b = primary["avgLst"], secondary["avgLst"]
    ndvi_a, ndvi_b = primary["avgNdvi"], secondary["avgNdvi"]
    hotspot_a, hotspot_b = primary["hotspotAreaPct"], secondary["hotspotAreaPct"]
    built_a, built_b = _share(primary_cover, "built-up"), _share(secondary_cover, "built-up")
    trees_a, trees_b = _share(primary_cover, "trees"), _share(secondary_cover, "trees")
    area_b = "Bucuresti" if secondary["sectorId"] == "all" else f"Sectorul {secondary['sectorId']}"
    comparison_name = f"anul {secondary['year']}" if kind == "year" else area_b

    if lst_a is None or lst_b is None or ndvi_a is None or ndvi_b is None:
        diagnosis = "Lipsesc LST sau NDVI pentru una dintre selectii; diferentele nu pot fi interpretate impreuna."
        action = "Nu stabili o prioritate de proiect din aceasta comparatie pana la completarea datelor."
    else:
        delta_lst = lst_b - lst_a
        if abs(delta_lst) < 0.3:
            heat = f"LST mediu este aproape egal: {lst_b:.2f} °C fata de {lst_a:.2f} °C"
        else:
            direction = "mai mare" if delta_lst > 0 else "mai mic"
            heat = f"LST mediu este cu {abs(delta_lst):.2f} °C {direction} in B ({lst_b:.2f} fata de {lst_a:.2f} °C)"
        delta_ndvi = ndvi_b - ndvi_a
        if abs(delta_ndvi) < 0.01:
            green = f"NDVI mediu este apropiat ({ndvi_b:.3f} fata de {ndvi_a:.3f})"
        else:
            green = f"NDVI mediu este {'mai mic' if delta_ndvi < 0 else 'mai mare'} in B ({ndvi_b:.3f} fata de {ndvi_a:.3f})"
        cover = []
        if built_a is not None and built_b is not None:
            cover.append(f"suprafete construite {built_b:.1f}% fata de {built_a:.1f}% in A")
        if trees_a is not None and trees_b is not None:
            cover.append(f"arbori {trees_b:.1f}% fata de {trees_a:.1f}%")
        cover_text = "; ".join(cover)
        if cover_text:
            diagnosis = f"Pentru {comparison_name}, {cover_text}. {green}; {heat}."
        else:
            diagnosis = f"Pentru {comparison_name}, {green}; {heat}. Land Cover nu este disponibil pentru ambele selectii."
        if hotspot_a is not None and hotspot_b is not None and abs(hotspot_b - hotspot_a) >= 3:
            diagnosis += f" Zonele foarte calde ocupa {hotspot_b:.1f}% in B fata de {hotspot_a:.1f}% in A."

        if built_b is not None and built_b >= 70 and (trees_b is None or trees_b < 8):
            action = (f"In {area_b}, {built_b:.1f}% este clasificat drept suprafata construita, inclusiv drumuri. "
                      "Pentru o parcela cu putin loc la sol, evalueaza un acoperis verde doar daca structura permite; "
                      "adauga arbori unde exista spatiu, umbra pentru pietoni si parcari si cat mai putin pavaj nou.")
            if delta_lst >= 0.3 or (hotspot_a is not None and hotspot_b is not None and hotspot_b - hotspot_a >= 3):
                action += " Localizeaza pe harta suprafetele foarte calde si incepe interventiile acolo."
        elif delta_lst >= 0.3 or (hotspot_a is not None and hotspot_b is not None and hotspot_b - hotspot_a >= 3):
            action = (f"Pentru un proiect in {area_b}, cauta pe harta zonele cele mai calde; acolo prioritizeaza "
                      "umbrirea, arborii si finisajele care nu acumuleaza usor caldura. Pastreaza solul permeabil.")
        elif delta_ndvi < -0.01 or (trees_a is not None and trees_b is not None and trees_b < trees_a - 2):
            action = (f"In {area_b}, pastreaza arborii existenti si aloca spatiu real pentru vegetatie in proiect. "
                      "Daca parcela este deja ocupata, verifica oportunitatea unui acoperis verde si a curtilor permeabile.")
        else:
            action = (f"In {area_b}, protejeaza arborii si solul permeabil pe parcela aleasa; "
                      "localizeaza hotspoturile inainte de a decide pavajul si spatiile exterioare.")
    historical_sectors = primary["year"] < 2025
    if historical_sectors:
        action = (f"Aceasta diferenta descrie anul {primary['year']}, nu conditiile actuale. "
                  "Pentru un proiect nou, compara aceleasi sectoare in 2025 si verifica daca semnalul persista.")
    note = ("Reper istoric; nu transforma diferentele dintre sectoare in prognoze."
            if historical_sectors else "Procentele pe sector nu arata ce loc liber exista pe o anumita parcela.")
    note += " Efectul viitor al unui parc si poluarea nu sunt estimate aici."
    return [
        {"title": "Ce spun datele impreuna", "body": diagnosis},
        {"title": "Cum folosesti acest reper" if historical_sectors else "Ce inseamna pentru proiect", "body": action},
    ], note
