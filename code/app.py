from flask import Flask, jsonify, render_template
import pickle
import requests

app = Flask(__name__)

content = pickle.load(open('op.bin', 'rb'))

# 查询产业链接
def query_industry():
    res = {}
    for k, v in content.items():
        res[k] = v['name']
    return res

# 查询详细产业链
def query_industry_datail(id):
    res = {}
    id = int(id)
    data = content[id]["children"]
    for k, v in data.items():
        res[f"{id}_{k}"] = v['name']
    return res

# 查询详细产业链列表
def query_industry_datail_list(id1, id2):
    res = {}
    id1 = int(id1)
    id2 = int(id2)
    data = content[id1]["children"][id2]["children"]
    for k, v in data.items():
        res[f"{id1}_{id2}_{k}"] = v['vname']
    return res

# 查询表
def query_meta_list(id1, id2, id3):
    res = {}
    id1 = int(id1)
    id2 = int(id2)
    id3 = int(id3)
    data = content[id1]["children"][id2]["children"][id3]["children"]
    for k, v in data.items():
        res[f"{id1}_{id2}_{id3}_{k}"] = v['cnname']
    return res

def download_data(meta_id) -> None:
    url = f"https://applet.agdata.cn/app-api/query/meta/readMate?metaId={meta_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36",
    }
    print(url)
    r = requests.get(url=url, headers=headers)
    csv = r.text
    csv = csv.replace('[', '').replace(']', '').replace('timeInt', '时间')
    return csv


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_children/<parent_id>')
def get_children(parent_id):
    # 返回特定父节点的子节点，此处仅返回静态数据
    ids = parent_id.split('_')
    if len(ids) == 1:
        if ids[0] == 'root':
            return jsonify(query_industry())
        else:
            return jsonify(query_industry_datail(ids[0]))
    elif len(ids) == 2:
        return jsonify(query_industry_datail_list(ids[0], ids[1]))
    
    elif len(ids) == 3:
        return jsonify(query_meta_list(ids[0], ids[1], ids[2]))
    
    else:
        return None

@app.route(f'/show_table/<id>')
def show_table(id):
    id1, id2, id3, id4 = id.split('_')
    id1 = int(id1)
    id2 = int(id2)
    id3 = int(id3)
    id4 = int(id4)
    fn1 = content[id1]["name"]
    fn2 = content[id1]["children"][id2]["name"]
    fn3 = content[id1]["children"][id2]["children"][id3]["vname"]
    fn4 = content[id1]["children"][id2]["children"][id3]["children"][id4]["cnname"]
    fn = '-'.join([fn1, fn2, fn3, fn4])
    tb = download_data(id4)
    unit = content[id1]["children"][id2]["children"][id3]["children"][id4]["unit"]
    dataUpdateTime = content[id1]["children"][id2]["children"][id3]["children"][id4]["dataUpdateTime"]
    dataSource = content[id1]["children"][id2]["children"][id3]["children"][id4]["dataSource"]
    timeType = content[id1]["children"][id2]["children"][id3]["children"][id4]["timeType"]

    res = {
        "fn": fn,
        "unit": unit,
        "dataUpdateTime": dataUpdateTime,
        "dataSource": dataSource,
        "timeType": timeType,
        "tb": tb
    }

    return jsonify(res)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=9000)