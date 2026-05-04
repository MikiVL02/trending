# Excel 批量编辑桌面应用 — 设计文档

**日期：** 2026-05-05  
**状态：** 已确认

---

## 一、项目背景

公司日常需要重复编制大量格式相似的 Excel 文件（包含编号、图片、表格数据等可变内容），手工操作重复率高、效率低。本应用允许用户上传 Excel 模板并标记可替换字段，后续只需提供数据即可批量生成填充好的输出文件。应用同时记忆已保存的模板，便于长期复用。

---

## 二、目标用户与使用场景

- 企业内部非技术人员，需要批量产出格式标准化的 Excel 报告、表单、证书等
- 每次生成任务对应一批数据行，每行产出一个独立 Excel 文件

---

## 三、整体架构

```
┌─────────────────────────────────────────┐
│           Electron 主进程               │
│  - 窗口管理                              │
│  - 文件读写（模板、输出文件）             │
│  - IPC 桥接（UI ↔ Python）              │
│  - 本地数据库（SQLite，存模板元数据）     │
└────────────────┬────────────────────────┘
                 │ stdin/stdout JSON
┌────────────────▼────────────────────────┐
│           Python 子进程                  │
│  - Excel 解析与生成（openpyxl）          │
│  - 图片替换                              │
│  - 批量填充，每行数据 → 一个输出文件      │
│  - 打包为独立可执行文件（PyInstaller）    │
└─────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           React 渲染进程（UI）           │
│  - 模板管理页                            │
│  - 字段映射配置页                        │
│  - 批量生成页                            │
└─────────────────────────────────────────┘
```

**技术栈：**
- 桌面壳：Electron（跨平台，支持 Windows + Mac）
- UI：React + Vite + Tailwind CSS
- Excel 处理：Python 3 + openpyxl
- 本地存储：SQLite（better-sqlite3）+ JSON 用户配置
- Python 打包：PyInstaller（内嵌可执行文件，用户无需安装 Python）

**数据持久化：**
- 模板文件副本：存储在用户 AppData 目录下
- 模板元数据、字段映射：SQLite
- 用户设置（输出目录偏好等）：JSON 文件

---

## 四、界面与交互流程

### 4.1 模板管理页（首页）

- 左侧：模板列表，支持分组/文件夹，可新建分组、重命名、删除
- 右侧：选中模板的预览信息（名称、字段数量、上次使用时间）
- 顶部操作：「新建模板」「导入模板」

### 4.2 模板配置页（新建或编辑模板时进入）

**第一步 — 上传模板文件：**
- 拖拽或点击选择 Excel 文件
- 上传后展示 Sheet 列表和单元格内容预览

**第二步 — 字段映射：**
- 方式一：在单元格预览上点选格子，输入字段名和类型
- 方式二：模板文件内使用 `{{字段名}}` 占位符，应用自动识别
- 两种方式可混用
- 每个字段需指定：字段名、类型（文本 / 图片 / 批量填充区域）、所在 Sheet、单元格地址或区域

### 4.3 批量生成页

1. 选择已保存的模板
2. 上传数据源 Excel 或手动在表格内填写数据
3. 字段列自动对应模板字段，用户确认映射关系
4. 设置输出文件命名规则（支持字段变量，如 `{{编号}}_报告.xlsx`）
5. 点击「生成」，显示进度条
6. 完成后展示输出文件列表，支持一键打开所在文件夹

---

## 五、数据模型

### Template（模板）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 唯一标识（UUID） |
| name | TEXT | 模板名称 |
| group | TEXT | 分组/文件夹名 |
| file_path | TEXT | 模板文件在 AppData 中的路径 |
| created_at | TEXT | 创建时间（ISO 8601） |
| updated_at | TEXT | 最后修改时间 |

### Field（字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 唯一标识（UUID） |
| template_id | TEXT | 所属模板 |
| name | TEXT | 字段名（如"编号"、"图片1"） |
| type | TEXT | `text` / `image` / `table_range` |
| sheet | TEXT | 所在 Sheet 名 |
| cell | TEXT | 单元格地址（如 B3）或区域（如 B3:D10） |

### GenerationRecord（生成记录，可选）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 唯一标识 |
| template_id | TEXT | 使用的模板 |
| created_at | TEXT | 生成时间 |
| output_dir | TEXT | 输出目录路径 |
| row_count | INTEGER | 生成文件数量 |

---

## 六、Python Excel 处理逻辑

**通信方式：** Electron 通过 `child_process.spawn` 启动 Python 可执行文件，通过 stdin/stdout 传递 JSON 指令。

### 支持的指令

**`parse_template`** — 解析模板文件
```json
// 输入
{ "action": "parse_template", "file_path": "/path/to/template.xlsx" }

// 输出
{ "sheets": ["Sheet1"], "placeholders": [{ "name": "编号", "sheet": "Sheet1", "cell": "B3" }] }
```

**`generate`** — 批量生成文件
```json
// 输入
{
  "action": "generate",
  "template_path": "/path/to/template.xlsx",
  "fields": [{ "name": "编号", "type": "text", "sheet": "Sheet1", "cell": "B3" }],
  "rows": [{ "编号": "001", "图片1": "/path/to/img.png" }],
  "output_dir": "/path/to/output",
  "filename_pattern": "{{编号}}_报告.xlsx"
}

// 输出
{ "results": [{ "row": 0, "status": "success", "file": "/path/to/output/001_报告.xlsx" }] }
```

### 批量生成流程（每行数据）

1. 复制模板文件到输出目录，按命名规则生成文件名
2. 打开副本，遍历字段映射：
   - `text`：写入单元格值，保留原有格式（字体、边框、样式）
   - `image`：用 openpyxl `add_image` 插入图片，覆盖指定单元格区域
   - `table_range`：从指定起始行开始，逐行写入多列数据
3. 保存文件

### 错误处理策略

| 错误场景 | 处理方式 |
|---------|---------|
| 某行数据缺少字段值 | 跳过该字段，记录警告，继续处理 |
| 图片路径不存在 | 跳过图片插入，记录警告 |
| 文件写入失败 | 记录该行为失败，继续处理其他行 |
| Python 进程崩溃 | 主进程捕获异常，显示错误信息 |

生成完成后，UI 展示：成功数 / 失败数 / 警告详情列表。

---

## 七、项目目录结构（规划）

```
excel-batch-editor/
├── electron/              # Electron 主进程
│   ├── main.js
│   ├── ipc/               # IPC 处理器
│   └── db/                # SQLite 操作
├── renderer/              # React 前端（Vite）
│   └── src/
│       ├── pages/
│       │   ├── TemplateList.jsx
│       │   ├── TemplateConfig.jsx
│       │   └── Generate.jsx
│       └── components/
├── python/                # Python Excel 处理模块
│   ├── main.py            # 入口，读取 stdin 指令
│   ├── parser.py          # 模板解析
│   └── generator.py       # 批量生成
├── package.json
└── requirements.txt
```

---

## 八、范围说明（不在本期内）

- 云端同步模板
- 多用户协作
- 支持 .xls 旧格式（仅支持 .xlsx）
- Excel 公式的动态计算（保留模板中已有公式，不新增）
