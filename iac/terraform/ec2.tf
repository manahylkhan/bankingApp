resource "aws_instance" "app" {
  ami           = "ami-0a7cf821b91bcccbc"  # Ubuntu (region specific)
  instance_type = "t2.micro"
  iam_instance_profile = aws_iam_instance_profile.app_profile.name

  tags = {
    Name = "secure-app"
  }
}
