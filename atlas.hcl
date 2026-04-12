env "local" {
  src = "file://internal/db/migrations"
  url = "postgres://gambchamp:gambchamp@localhost:5432/gambchamp?sslmode=disable"
  dev = "docker://postgres/16/dev?search_path=public"

  migration {
    dir = "file://internal/db/migrations"
  }
}
