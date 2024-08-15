# Bot đăng ký học phần UIT

## Dependencies

- Node v20 hoặc hơn

## Bắt đầu

1. Tạo file config

```sh
cp example.dkhp.config.json dkhp.config.json
```

2. Chỉnh sửa nội dung file config

```jsonc
{
    "username": "23520000", // MSSV
    "password": "your extremely secure password", // MK
    "classes": [ // Mã lớp cần đăng ký
        "SE347.P12",
        "SE347.P12.1",
        "SS006.P18",
        "SS008.P12",
        "or other any class code"
    ]
}
```


4. Bắt đầu chạy

```sh
npm install && npm run run
```

## Tính năng

- [ ] Tự động bắt đầu khi đúng thời gian
- [ ] Tự động exit khi thành công