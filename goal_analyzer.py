import json
import os
from datetime import datetime


def load_data():
    base_dir = "data-example"
    tracker_path = os.path.join(base_dir, "health-goals-tracker.json")
    nutrition_path = os.path.join(base_dir, "nutrition-tracker.json")
    
    with open(tracker_path, 'r', encoding='utf-8') as f:
        tracker_data = json.load(f)
        
    return tracker_data

def generate_html_report(data):
    goals = data.get("goals", [])
    habits = data.get("habits", [])
    
    # Calculate progress for goals
    goal_charts = []
    for goal in goals:
        progress = (goal['current_value'] / goal['target_value']) * 100
        goal_charts.append({
            'title': goal['title'],
            'progress': progress,
            'current': goal['current_value'],
            'target': goal['target_value']
        })
        
    html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>健康目标分析报告</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa; color: #333; margin: 0; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .card {{ background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px; margin-bottom: 20px; }}
        .chart-container {{ width: 100%; height: 400px; }}
        .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>健康目标分析报告</h1>
            <p>生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h2>SMART 评估概览</h2>
                <div id="smartChart" class="chart-container"></div>
            </div>
            <div class="card">
                <h2>目标进度</h2>
                <div id="progressChart" class="chart-container"></div>
            </div>
        </div>
        
        <div class="card">
            <h2>习惯追踪 - 连续天数</h2>
            <div id="habitChart" class="chart-container"></div>
        </div>
    </div>

    <script>
        // SMART Radar Chart
        var smartChart = echarts.init(document.getElementById('smartChart'));
        var smartOption = {{
            tooltip: {{}},
            radar: {{
                indicator: [
                    {{ name: '具体性 (Specific)', max: 5 }},
                    {{ name: '可衡量性 (Measurable)', max: 5 }},
                    {{ name: '可实现性 (Achievable)', max: 5 }},
                    {{ name: '相关性 (Relevant)', max: 5 }},
                    {{ name: '有时限 (Time-bound)', max: 5 }}
                ]
            }},
            series: [{{
                name: 'SMART 评估',
                type: 'radar',
                data: [
                    {{
                        value: [5, 5, 4, 5, 5],
                        name: '减重目标'
                    }}
                ],
                areaStyle: {{ color: 'rgba(54, 162, 235, 0.2)' }}
            }}]
        }};
        smartChart.setOption(smartOption);

        // Progress Bar Chart
        var progressChart = echarts.init(document.getElementById('progressChart'));
        var progressOption = {{
            tooltip: {{ formatter: '{{b}}: {{c}}%' }},
            xAxis: {{ type: 'value', max: 100 }},
            yAxis: {{ type: 'category', data: {json.dumps([g['title'] for g in goal_charts])} }},
            series: [{{
                type: 'bar',
                data: {json.dumps([round(g['progress'], 1) for g in goal_charts])},
                itemStyle: {{ color: '#4CAF50' }},
                label: {{ show: true, position: 'right', formatter: '{{c}}%' }}
            }}]
        }};
        progressChart.setOption(progressOption);

        // Habits Chart
        var habitChart = echarts.init(document.getElementById('habitChart'));
        var habitOption = {{
            tooltip: {{}},
            xAxis: {{ type: 'category', data: {json.dumps([h['title'] for h in habits])} }},
            yAxis: {{ type: 'value', name: '连续天数' }},
            series: [{{
                type: 'bar',
                data: {json.dumps([h['current_streak'] for h in habits])},
                itemStyle: {{ color: '#FF9800' }}
            }}]
        }};
        habitChart.setOption(habitOption);
        
        window.addEventListener('resize', function() {{
            smartChart.resize();
            progressChart.resize();
            habitChart.resize();
        }});
    </script>
</body>
</html>"""

    with open("health_report.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    print("HTML report generated at health_report.html")

def generate_markdown_report(data):
    goals = data.get("goals", [])
    habits = data.get("habits", [])
    
    md = "# 健康目标分析报告\n\n"
    
    for goal in goals:
        md += f"## 目标: {goal['title']}\n"
        md += f"- **状态**: {goal['status']}\n"
        progress = (goal['current_value'] / goal['target_value']) * 100
        md += f"- **进度**: {progress:.1f}% ({goal['current_value']} / {goal['target_value']} {goal['unit']})\n"
        
        if 'smart_evaluation' in goal:
            s = goal['smart_evaluation']
            overall = sum(s.values()) / 5
            md += f"### SMART评估 (总体评分: {overall:.1f}/5)\n"
            md += f"- 具体性: {'⭐'*s['specific']} ({s['specific']}/5)\n"
            md += f"- 可衡量性: {'⭐'*s['measurable']} ({s['measurable']}/5)\n"
            md += f"- 可实现性: {'⭐'*s['achievable']} ({s['achievable']}/5)\n"
            md += f"- 相关性: {'⭐'*s['relevant']} ({s['relevant']}/5)\n"
            md += f"- 有时限: {'⭐'*s['time_bound']} ({s['time_bound']}/5)\n"
        md += "\n"
        
    md += "## 习惯追踪\n"
    for habit in habits:
        md += f"### {habit['title']}\n"
        md += f"- 当前连续: {habit['current_streak']}天 🔥\n"
        md += f"- 历史最长: {habit['longest_streak']}天\n"
        md += f"- 完成率: {habit['completion_rate']}%\n\n"
        
    with open("health_report.md", "w", encoding="utf-8") as f:
        f.write(md)
    print("Markdown report generated at health_report.md")

if __name__ == "__main__":
    data = load_data()
    generate_markdown_report(data)
    generate_html_report(data)
