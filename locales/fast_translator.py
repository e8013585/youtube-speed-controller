import os
import json
import time
import re
from deep_translator import GoogleTranslator

BATCH_SIZE = 20

def protect_variables(text):
    return re.sub(r'\$(\d+)', r'__VAR\1__', text)

def restore_variables(text):
    return re.sub(r'__VAR(\d+)__', r'$\1', text)

def translate_batch(strings, translator):
    protected = [protect_variables(s) for s in strings]
    translated = translator.translate_batch(protected)
    return [restore_variables(t) for t in translated]

def translate_json(data, translator):

    keys=[]
    values=[]

    for k,v in data.items():
        if isinstance(v,str) and v.strip():
            keys.append(k)
            values.append(v)

    result=dict(data)

    for i in range(0,len(values),BATCH_SIZE):

        batch_vals=values[i:i+BATCH_SIZE]
        batch_keys=keys[i:i+BATCH_SIZE]

        for attempt in range(3):
            try:

                translated=translate_batch(batch_vals,translator)

                for k,t in zip(batch_keys,translated):
                    result[k]=t

                break

            except Exception:

                if attempt<2:
                    time.sleep(2)
                else:
                    for k,v in zip(batch_keys,batch_vals):
                        result[k]=v

        time.sleep(0.25)

    return result

def main():

    with open('en.json','r',encoding='utf-8') as f:
        en_data=json.load(f)

    lang_map={
        "fil":"tl",
        "he":"iw",
        "nb":"no",
        "pt-BR":"pt",
        "pt-PT":"pt",
        "zh-CN":"zh-cn",
        "zh-TW":"zh-tw"
    }

    target_langs=[
        "es","ru","tr","de","fil","id","sw","ms","nl","vi","ca","da","et","fr","hr",
        "it","lv","lt","hu","nb","uz","pl","pt-BR","pt-PT","ro","sk","sl","fi","sv",
        "cs","el","bg","sr","uk","he","ar","fa","mr","hi","bn","gu","ta","te","kn",
        "ml","th","am","zh-CN","zh-TW","ja","ko","tk","tt"
    ]

    for lang in target_langs:

        target=lang_map.get(lang,lang)

        print(f"ðŸŒ Translating -> {lang}.json")

        try:

            translator=GoogleTranslator(source='en',target=target)

            translated=translate_json(en_data,translator)

            with open(f"{lang}.json",'w',encoding='utf-8') as f:
                json.dump(translated,f,ensure_ascii=False,indent=2)

        except Exception as e:
            print(f"Error translating {lang}: {e}")

if __name__=="__main__":
    main()